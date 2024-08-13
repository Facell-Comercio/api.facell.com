const { db } = require("../../../../../mysql");
const fs = require("fs/promises");

const { logger } = require("../../../../../logger");
const { remessaToObject } = require("../../remessa/to-object");
const constants = require("../../remessa/layout/ITAU/constants");
const { normalizeNumberOnly } = require("../../../../helpers/mask");
const { pagarVencimento, pagarFatura } = require("./pagamentoItens");

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
                (d.cod_seg_registro_lote === "J" && d.codigo_registro != "52")
            );
            // console.log(segmentos);
            if (!segmentos || !segmentos.length) {
              continue;
            }
            for (const segmento of segmentos) {
              const id_vencimento = String(segmento.id_vencimento).trim();
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
                const isFatura = id_vencimento[0] === "F";
                const updatedTable = isFatura
                  ? "fin_cartoes_corporativos_faturas"
                  : "fin_cp_titulos_vencimentos";
                const ocorrenciasErro = ocorrencias.filter(
                  (e) => e != "00" && e != "BD"
                );
                if (ocorrenciasErro.length) {
                  const erros = ocorrenciasErro.map((erro) => {
                    return CodigosOcorrencias[erro];
                  });
                  //* Inicando que o item pode ser incluso na remessa novamente
                  await conn.execute(
                    `
                      UPDATE fin_cp_bordero_itens
                      SET remessa = ?
                      WHERE ${isFatura ? "id_fatura = ?" : "id_vencimento = ?"}
                      AND id_bordero = ?
                    `,
                    [false, normalizeNumberOnly(id_vencimento), id_bordero]
                  );

                  //* Atualizando dados informativos sobre o item
                  await conn.execute(
                    `
                      UPDATE ${updatedTable} 
                      SET status = "erro", obs = ? 
                      WHERE id = ?
                      `,
                    [erros.join(", "), normalizeNumberOnly(id_vencimento)]
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
                      UPDATE ${updatedTable} SET status = "programado" WHERE id = ?
                      `,
                    [normalizeNumberOnly(id_vencimento)]
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

                  const item = {
                    id_vencimento: isFatura
                      ? normalizeNumberOnly(id_vencimento)
                      : id_vencimento,
                    tipo: isFatura ? "fatura" : "vencimento",
                    tipo_baixa: "PADRÃO",
                    valor_pago: valorPago,
                    valor_total: valorPago,
                    remessa: 1,
                  };

                  if (isFatura) {
                    pagarFatura({
                      user: req.user,
                      conn,
                      fatura: item,
                      data_pagamento: dataPagamento,
                      obs: "PAGAMENTO REALIZADO NO RETORNO DA REMESSA",
                    });
                  } else {
                    pagarVencimento({
                      user: req.user,
                      conn,
                      vencimento: item,
                      data_pagamento: dataPagamento,
                      obs: "PAGAMENTO REALIZADO NO RETORNO DA REMESSA",
                    });
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
