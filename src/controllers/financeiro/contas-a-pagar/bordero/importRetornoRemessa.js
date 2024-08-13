const { db } = require("../../../../../mysql");
const fs = require("fs/promises");

const { logger } = require("../../../../../logger");
const { remessaToObject } = require("../../remessa/to-object");
const constants = require("../../remessa/layout/ITAU/constants");

module.exports = async function importRetornoRemessa(req) {
  return new Promise(async (resolve, reject) => {
    const id_bordero = req.params.id;
    const conn = await db.getConnection();
    const CodigosOcorrencias = constants.CodigosOcorrencias;
    try {
      await conn.beginTransaction();

      const files = req.files;
      if (!files || !files.length) {
        throw new Error("Arquivos não recebidos!");
      }

      let sequencial_arquivo = 1;
      const pagamentos = [];
      for (const file of files) {
        const filePath = file?.path;
        try {
          if (!filePath) {
            throw new Error("O arquivo não importado corretamente!");
          }

          // Ler e fazer parse do arquivo
          const data = await fs.readFile(filePath, "utf8");
          const objRemessa = await remessaToObject(data);
          // Passagem pelos lotes
          const lotes = objRemessa.lotes;
          if (!lotes || !lotes.length) {
            throw new Error(
              "Aquivo vazio ou não foi possível acessar os lotes de boletos..."
            );
          }
          for (const lote of lotes) {
            // Passagem pelos segmentos G

            const segmentos = lote.detalhe?.filter(
              (d) =>
                d.cod_seg_registro_lote === "A" ||
                d.cod_seg_registro_lote === "O" ||
                (d.cod_seg_registro_lote === "J" && d.registro_cod != "52")
            );

            if (!segmentos || !segmentos.length) {
              continue;
            }
            for (const segmento of segmentos) {
              const id_vencimento = parseInt(
                String(segmento.id_vencimento).trim()
              );

              const ocorrencias =
                String(segmento.ocorrencias)
                  .trim()
                  .match(/.{1,2}/g) || [];
              const pagamento = {
                sequencial_arquivo,
                id_vencimento,
                ocorrencias: ocorrencias.join(", "),
                status: "sucesso",
              };
              try {
                const [rowVencimento] = await conn.execute(
                  `
                  SELECT 
                    tv.id, tv.id_titulo, tv.status, tv.valor
                  FROM fin_cp_titulos_vencimentos tv
                  LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
                  WHERE tv.id = ? AND bi.id_bordero = ?
                  `,
                  [id_vencimento, id_bordero]
                );
                const vencimento = rowVencimento && rowVencimento[0];

                //* Verificando a existencia do vencimento
                if (!vencimento) {
                  throw new Error(`Vencimento não encontrado no sistema`);
                }

                //* Verificando se o status do vencimento é pago
                if (vencimento.status === "pago") {
                  throw new Error(`Vencimento já constava como pago`);
                }

                const ocorrenciasErro = ocorrencias.filter(
                  (e) => e != "00" && e != "BD"
                );
                if (ocorrenciasErro.length) {
                  const erros = ocorrenciasErro.map((erro) => {
                    return CodigosOcorrencias[erro];
                  });
                  //* Inicando que o vencimento pode ser incluso na remessa novamente
                  await conn.execute(
                    `
                      UPDATE fin_cp_bordero_itens
                      SET remessa = ?
                      WHERE id_vencimento = ?
                      AND id_bordero = ?
                    `,
                    [false, vencimento.id, id_bordero]
                  );

                  //* Atualizando dados informativos sobre o vencimento
                  await conn.execute(
                    `
                      UPDATE fin_cp_titulos_vencimentos 
                      SET status = "erro", obs = ? 
                      WHERE id = ?
                      `,
                    [erros.join(", "), vencimento.id]
                  );

                  if (ocorrenciasErro.length > 1) {
                    throw new Error(`${erros.join("\n")}`);
                  } else {
                    throw new Error(`${erros.join("\n")}`);
                  }
                }
                if (ocorrencias[0] === "BD") {
                  await conn.execute(
                    `
                      UPDATE fin_cp_titulos_vencimentos SET status = "programado" WHERE id = ?
                      `,
                    [vencimento.id]
                  );
                  pagamento.status = "programado";
                }
                if (ocorrencias[0] == "00") {
                  const valorPago =
                    segmento.valor_real_efetivacao_pgto ||
                    segmento.valor_pagamento;
                  const dataPagamento =
                    segmento.data_real_efetivacao_pgto ||
                    segmento.data_pagamento;

                  await conn.execute(
                    `
                        UPDATE fin_cp_titulos_vencimentos 
                        SET status = "pago", valor = ?, valor_pago = ?, 
                        tipo_baixa = "PADRÃO", data_pagamento = ?, 
                        obs="PAGAMENTO REALIZADO NO RETORNO DA REMESSA" WHERE id = ?
                        `,
                    [valorPago, valorPago, dataPagamento, vencimento.id]
                  );

                  // * Obtém os vencimentos não pagos do titulo
                  const [vencimentosNaoPagos] = await conn.execute(
                    `
                          SELECT 
                            tv.id 
                          FROM fin_cp_titulos_vencimentos tv
                          WHERE tv.id_titulo = ? 
                          AND tv.data_pagamento IS NULL
                        `,
                    [vencimento.id_titulo]
                  );

                  if (vencimentosNaoPagos.length === 0) {
                    // ^ Se todos os vencimentos estiverem pagos muda o status do titulo para pago
                    await conn.execute(
                      `UPDATE fin_cp_titulos SET id_status = 5 WHERE id = ?`,
                      [vencimento.id_titulo]
                    );
                  }
                  if (vencimentosNaoPagos.length > 0) {
                    // ^ Se houverem vencimentos ainda não pagos no título muda o status do titulo para pago parcial
                    await conn.execute(
                      `UPDATE fin_cp_titulos SET id_status = 4 WHERE id = ?`,
                      [vencimento.id_titulo]
                    );
                  }
                }
              } catch (error) {
                pagamento.status = "error";
                pagamento.obs = error.message;
              } finally {
                pagamentos.push(pagamento);
              }
            }
          }
        } catch (error) {
          pagamentos.push({
            sequencial_arquivo,
            status: "error",
            obs: error.message,
          });
          logger.error({
            module: "FINANCEIRO",
            origin: "BORDERO",
            method: "IMPORT RETORNO REMESSA",
            data: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          });
        } finally {
          sequencial_arquivo++;
          try {
            await fs.unlink(filePath);
          } catch (unlinkErr) {
            logger.error({
              module: "FINANCEIRO",
              origin: "BORDERO",
              method: "UNLINK IMPORT RETORNO REMESSA",
              data: {
                message: unlinkErr.message,
                stack: unlinkErr.stack,
                name: unlinkErr.name,
              },
            });
          }
        }
      }

      await conn.commit();
      // await conn.rollback();
      resolve(pagamentos);
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "IMPORTAR RETORNO DE REMESSA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
