const { db } = require("../../../../../../mysql");
const fs = require("fs/promises");
require("dotenv").config();

const { logger } = require("../../../../../../logger");
const { remessaToObject } = require("../../../remessa/CNAB400/to-object");
const constantsItau = require("../../../remessa/CNAB400/bancos/itau/constants");
const constantsBradesco = require("../../../remessa/CNAB400/bancos/bradesco/constants");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      const cod_banco = req?.body?.cod_banco;
      let CodigosOcorrencias;
      if (cod_banco == 237) {
        CodigosOcorrencias = constantsBradesco.CodigosOcorrencias;
      }
      if (cod_banco == 341) {
        CodigosOcorrencias = constantsItau.CodigosOcorrencias;
      }

      const files = req.files;
      if (!files || !files.length) {
        throw new Error("Arquivos não recebidos!");
      }

      let sequencial_arquivo = 1;
      const pagamentos = [];
      let qtde_detalhes = 0;
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
          const detalhes = objRemessa.arquivoDetalhe;
          qtde_detalhes = detalhes.length;
          const data_emissao = objRemessa.arquivoHeader.data_emissao;
          for (const detalhe of detalhes) {
            const id_boleto = detalhe.nosso_numero;
            const cod_ocorrencia = detalhe.cod_ocorrencia;
            const { data_vencimento, num_doc, nosso_numero, num_carteira } = detalhe;
            const obs = constants.CodigosOcorrencias[cod_ocorrencia];
            let obj = {
              sequencial_arquivo: detalhe.sequencial_arquivo,
              obs,
            };

            await conn.execute(
              `
              UPDATE datasys_caixas_boletos SET
                data_emissao = ?,
                data_vencimento = ?,
                documento = ?,
                nosso_numero = ?,
                num_carteira = ?,
                obs = ?
              WHERE id = ?
              `,
              [data_emissao, data_vencimento, num_doc, nosso_numero, num_carteira, obs, id_boleto]
            );

            if (cod_ocorrencia === 2) {
              // Lógica movida para o exportRemessaBoleto...

              obj = { ...obj, status: "emitido" };
            } else if (cod_ocorrencia === 6) {
              // * APLICAÇÃO DE STATUS PAGO:
              await conn.execute("UPDATE datasys_caixas_boletos SET status = 'pago' WHERE id = ?", [
                id_boleto,
              ]);
              obj = { ...obj, status: "pago" };
            } else {
              // * APLICAÇÃO DE STATUS ERRO:
              const [rowsBoletoBanco] = await conn.execute(
                "SELECT status FROM datasys_caixas_boletos WHERE id = ?",
                [id_boleto]
              );
              const status = rowsBoletoBanco && rowsBoletoBanco[0] && rowsBoletoBanco[0]["status"];
              if (status == "emitido") {
                await conn.execute(
                  "UPDATE datasys_caixas_boletos SET status = 'erro' WHERE id = ?",
                  [id_boleto]
                );
              }
              obj = {
                ...obj,
                status: "erro",
              };
            }

            pagamentos.push(obj);
          }
        } catch (error) {
          pagamentos.push({
            sequencial_arquivo,
            status: "error",
            obs: error.message,
          });
          logger.error({
            module: "FINANCEIRO",
            origin: "CONFERENCIA_DE_CAIXA",
            method: "IMPORT_RETORNO_REMESSA_BOLETO",
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
              origin: "CONFERENCIA_DE_CAIXA",
              method: "UNLINK_IMPORT_RETORNO_REMESSA_BOLETO",
              data: {
                message: unlinkErr.message,
                stack: unlinkErr.stack,
                name: unlinkErr.name,
              },
            });
          }
        }
      }

      // * Insert em log de importações de relatórios:
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
        [
          req.user.id,
          "IMPORT_RETORNO_BOLETO_CAIXA",
          `Foram importados os resultados de ${qtde_detalhes} boletos!`,
        ]
      );

      await conn.commit();
      // await conn.rollback();
      resolve(pagamentos);
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "IMPORT_RETORNO_REMESSA_BOLETO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
