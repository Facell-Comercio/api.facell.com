const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
require("dotenv").config();

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { id_campanha } = req.body;
    const token = process.env.TOKEN_EVOLUX;
    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [subcampanhas] = await conn.execute(
        "SELECT id FROM marketing_mailing_campanhas WHERE id_parent = ?",
        [id_campanha]
      );
      const idsCampanhas = [id_campanha, subcampanhas.map((subcampanha) => subcampanha.id)].flat();

      const [clientes] = await conn.execute(
        `SELECT id, gsm FROM marketing_mailing_clientes WHERE id_campanha IN ('${idsCampanhas.join(
          "','"
        )}')`
      );

      for (const cliente of clientes) {
        // const url = `https://facell.evolux.io/api/v1/dialer/calls_history?external_id=${cliente.id}`
        const url = `https://facell.evolux.io/api/v1/dialer/calls_history?start_date=2024-08-01&end_date=2024-09-01&number=${cliente.gsm}`;
        await fetch(url, {
          method: "GET",
          headers: {
            "token": token,
          },
        })
          .then((res) => res.json())
          .then(async (res) => {
            for (const result of res.data) {
              await conn.execute(
                `
                  INSERT IGNORE INTO marketing_mailing_resultados
                  (
                    id_cliente,
                    status_contato,
                    data_contato,
                    hora_contato,
                    operador_contato,
                    observacao,
                    id_user
                  ) VALUES (?,?,?,?,?,?,?)
                  `,
                [
                  cliente.id,
                  result.outcome,
                  result.start_time,
                  result.start_time,
                  result.agent.name,
                  result.hangup_cause || null,
                  req.user.id,
                ]
              );
            }
          })
          .catch((error) => {
            logger.error({
              module: "MARKETING",
              origin: "MAILING",
              method: "IMPORT_CAMPANHA_EVOLUX_FETCH",
              data: {
                message: error.message,
                stack: error.stack,
                name: error.name,
              },
            });
          });
      }

      // DOCUMENTAÇÃO
      // https://evolux.atlassian.net/wiki/spaces/DOC/pages/1958412335/API+-+Relat+rio+-+Discador+-+Hist+rico+de+Chamadas

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "IMPORT_CAMPANHA_EVOLUX",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
