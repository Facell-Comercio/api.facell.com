const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { formatDate } = require("date-fns");
require("dotenv").config();

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { range_datas } = req.body;
    const token = process.env.TOKEN_EVOLUX;
    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      // const url = `https://facell.evolux.io/api/v1/dialer/calls_history?external_id=${cliente.id}`
      const url = `https://facell.evolux.io/api/v1/dialer/calls_history?start_date=${formatDate(
        range_datas.from,
        "yyyy-MM-dd"
      )}&end_date=${formatDate(range_datas.to, "yyyy-MM-dd")}`;

      const resultados = await fetch(url, {
        method: "GET",
        headers: {
          "token": token,
        },
      })
        .then((res) => res.json())
        .then(async (res) => res.data)
        .catch((error) => {
          logger.error({
            module: "MARKETING",
            origin: "MAILING",
            method: "IMPORT_CAMPANHA_EVOLUX_DIARIO_FETCH",
            data: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          });
        });

      for (const resultado of resultados) {
        await conn.execute(
          `
            INSERT IGNORE INTO marketing_mailing_resultados
            (
              id_cliente,
              status_contato,
              data_contato,
              hora_contato,
              operador_contato,
              observacao
            ) VALUES (?,?,?,?,?,?)
            `,
          [
            resultado.subscriber.external_id,
            resultado.outcome,
            resultado.start_time,
            resultado.start_time,
            resultado.agent.name,
            resultado.hangup_cause || null,
          ]
        );
      }

      // DOCUMENTAÇÃO
      // https://evolux.atlassian.net/wiki/spaces/DOC/pages/1958412335/API+-+Relat+rio+-+Discador+-+Hist+rico+de+Chamadas

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "IMPORT_CAMPANHA_EVOLUX_DIARIO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
