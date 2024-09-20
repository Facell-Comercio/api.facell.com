const { db } = require("../../../../../../mysql");
const fs = require("fs/promises");

const { logger } = require("../../../../../../logger");
const { remessaToObject } = require("../../../remessa/CNAB400/to-object");
const constants = require("../../../remessa/CNAB400/layout/ITAU/constants");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
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
          const detalhes = objRemessa.arquivoDetalhe;
          const data_emissao = objRemessa.arquivoHeader.data_emissao;
          for (const detalhe of detalhes) {
            const id_boleto = detalhe.nosso_numero;
            const cod_ocorrencia = detalhe.cod_ocorrencia;
            const { data_vencimento, num_doc, nosso_numero } = detalhe;

            let obj = {
              sequencial_arquivo: detalhe.sequencial_arquivo,
              obs: constants.CodigosOcorrencias[cod_ocorrencia],
            };

            if (cod_ocorrencia === 2) {
              await conn.execute(
                `
                UPDATE datasys_caixas_boletos SET
                  status = 'emitido',
                  data_emissao = ?,
                  data_vencimento = ?,
                  documento = ?,
                  nosso_numero = ?
                WHERE id = ?
                `,
                [data_emissao, data_vencimento, num_doc, nosso_numero, id_boleto]
              );
              obj = { ...obj, status: "emitido" };
            } else if ([6, 8, 9, 10].includes(cod_ocorrencia)) {
              await conn.execute(
                `
                UPDATE datasys_caixas_boletos SET
                  status = 'pago',
                  data_emissao = ?,
                  data_vencimento = ?,
                  documento = ?,
                  nosso_numero = ?
                WHERE id = ?
                `,
                [data_emissao, data_vencimento, num_doc, nosso_numero, id_boleto]
              );
              obj = { ...obj, status: "pago" };
            } else {
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

      await conn.commit();
      // await conn.rollback();
      resolve(pagamentos);
    } catch (error) {
      await conn.rollback();
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "IMPORT_RETORNO_REMESSA_REMESSA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
