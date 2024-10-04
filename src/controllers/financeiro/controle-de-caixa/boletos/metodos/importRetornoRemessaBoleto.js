const { db } = require("../../../../../../mysql");
const fs = require("fs/promises");
require("dotenv").config();

const { logger } = require("../../../../../../logger");
const { remessaToObject } = require("../../../remessa/CNAB400/to-object");
const constants = require("../../../remessa/CNAB400/layout/constants");
const { enviarEmail } = require("../../../../../helpers/email");
const { normalizeDate, normalizeCurrency } = require("../../../../../helpers/mask");
const { formatDate } = require("date-fns");

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
              await conn.execute(
                "UPDATE datasys_caixas_boletos SET status = 'emitido' WHERE id = ?",
                [id_boleto]
              );
              const [rowsBoletos] = await conn.execute(
                `
                SELECT dcb.*, dcrb.email, f.nome as filial FROM datasys_caixas_receptores_boletos dcrb
                LEFT JOIN datasys_caixas_boletos dcb ON dcb.id_filial = dcrb.id_filial
                LEFT JOIN filiais f ON f.id = dcrb.id_filial
                WHERE dcb.id = ?`,
                [id_boleto]
              );

              //* Envio de email para receptores de boletos da loja
              if (rowsBoletos.length > 0) {
                const boleto = rowsBoletos && rowsBoletos[0];
                const emails = rowsBoletos?.map((boleto) => boleto.email);
                const link =
                  process.env.NODE_ENV === "production"
                    ? `https://api.facell.com/visualizar.boleto.caixa?id=${boleto.id}`
                    : `http://localhost:7000/visualizar.boleto.caixa?id=${boleto.id}`;

                await enviarEmail({
                  destinatarios: [emails],
                  assunto: `Novo Boleto Emitido - ${normalizeCurrency(
                    boleto.valor
                  )} - Vencimento ${formatDate(boleto.data_vencimento, "dd/MM/yyyy")}`,
                  corpo_html: `
                    <p>Valor: ${normalizeCurrency(boleto.valor)}<br/>
                    Data de emissão:  ${formatDate(boleto.data_emissao, "dd/MM/yyyy")}<br/>
                    Data de vencimento: ${formatDate(boleto.data_vencimento, "dd/MM/yyyy")}<br/>
                    Link para visualizar o boleto:</p>
                    <a href='${link}'>${link}</a>
                  `,
                });
              }

              obj = { ...obj, status: "emitido" };
            } else if ([6, 8, 9, 10].includes(cod_ocorrencia)) {
              await conn.execute("UPDATE datasys_caixas_boletos SET status = 'pago' WHERE id = ?", [
                id_boleto,
              ]);
              obj = { ...obj, status: "pago" };
            } else {
              await conn.execute("UPDATE datasys_caixas_boletos SET status = 'erro' WHERE id = ?", [
                id_boleto,
              ]);
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
