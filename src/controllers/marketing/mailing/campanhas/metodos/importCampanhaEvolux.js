const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { formatDate, subHours, startOfDay, endOfDay, parseISO } = require("date-fns");
require("dotenv").config();

function startOfDayUTC(dateString) {
  const date = parseISO(dateString);

  // Cria um objeto Date em UTC ajustado para o início do dia
  const startOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
  );

  return startOfDay.toISOString();
}

function endOfDayUTC(dateString) {
  const date = parseISO(dateString);

  // Cria um objeto Date em UTC ajustado para o fim do dia
  const endOfDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)
  );

  return endOfDay.toISOString();
}

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { range_datas } = req.body;
    const token = process.env.TOKEN_EVOLUX;
    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      if (!(range_datas.from && range_datas.to)) {
        throw new Error("Os filtros de datas não estão preenchidos corretamente!");
      }

      const resultados = [];
      const limit = 50;
      let page = 0;

      while (true) {
        const url = `https://facell.evolux.io/api/v1/dialer/calls_history?start_date=${startOfDayUTC(
          range_datas.from
        )}&end_date=${endOfDayUTC(range_datas.to)}&limit=${limit}&page=${page}`;
        console.log(url);

        const resultadoFetch = await fetch(url, {
          method: "GET",
          headers: {
            "token": token,
          },
        })
          .then((res) => res.json())
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

        if (!resultadoFetch.data || resultadoFetch.data.length === 0) {
          break;
        }
        resultados.push(resultadoFetch.data);
        page++;
      }

      for (const resultado of resultados.flat()) {
        await conn.execute(
          `
            INSERT IGNORE INTO marketing_mailing_resultados
            (
              id,
              id_cliente,
              nome_campanha,
              nome_assinante,
              status_contato,
              data_contato,
              hora_contato_inicio,
              hora_contato_resposta,
              hora_contato_final,
              duracao_chamada,
              operador_contato,
              observacao,
              classificacao,
              id_user
            ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            `,
          [
            resultado.id, // ID
            resultado.subscriber.external_id, // ID_CLIENTE
            resultado.campaign.name, // NOME_CAMPANHA
            resultado.subscriber.name, // NOME_ASSINANTE
            resultado.outcome, //STATUS_CONTATO
            new Date(resultado.start_time), // DATA_CONTATO
            new Date(resultado.start_time), // HORA_CONTATO_INICIO
            new Date(resultado.answer_time), // HORA_CONTATO_RESPOSTA
            new Date(resultado.end_time), // HORA_CONTATO_FINAL
            resultado.talking_duration, // DURACAO_CHAMADA
            resultado.agent.name, // OPERADOR_CONTATO
            resultado.hangup_cause || null, // OBSERVACAO
            resultado.classification || null, // CLASSIFICACAO
            req.user.id || null, // ID_USER
          ]
        );
      }

      // DOCUMENTAÇÃO
      // https://evolux.atlassian.net/wiki/spaces/DOC/pages/1958412335/API+-+Relat+rio+-+Discador+-+Hist+rico+de+Chamadas

      await conn.commit();
      resolve(resultados.flat());
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
