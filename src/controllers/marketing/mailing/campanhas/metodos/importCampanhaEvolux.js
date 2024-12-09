const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { parseISO } = require("date-fns");
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

      const arrayResultados = [];
      const maxLength = 10000;
      let totalResultados = resultados.flat().length;

      for (const resultado of resultados.flat()) {
        arrayResultados.push(
          `(
            ${db.escape(resultado.id)}, -- ID
            ${db.escape("evolux")}, -- PLATAFORMA
            ${db.escape(resultado.subscriber.external_id)}, -- ID CLIENTE
            ${db.escape(resultado.campaign.name)}, -- NOME CAMPANHA
            ${db.escape(resultado.subscriber.name)}, -- NOME ASSINANTE
            ${db.escape(resultado.subscriber.number)}, -- NÚMERO ASSINANTE
            ${db.escape(resultado.outcome)}, -- STATUS
            ${db.escape(new Date(resultado.start_time))}, -- DATA
            ${db.escape(new Date(resultado.start_time))}, -- HORA CONTATO INICIO
            ${db.escape(new Date(resultado.answer_time))}, -- HORA CONTATO RESPOSTA
            ${db.escape(new Date(resultado.end_time))}, -- HORA CONTATO FINAL
            ${db.escape(resultado.talking_duration)}, -- DURACAO CHAMADA
            ${db.escape(resultado.agent.name)}, -- OPERADOR
            ${db.escape(resultado.hangup_cause || null)}, -- OBSERVACAO
            ${db.escape(resultado.classification || null)}, -- CLASSIFICACAO
            ${db.escape(req.user.id)} -- ID USER
          )`
        );

        if (arrayResultados.length === maxLength || totalResultados === 1) {
          const query = `
            INSERT IGNORE INTO marketing_mailing_interacoes
            (
              id,
              plataforma,
              id_cliente,
              nome_campanha,
              nome_assinante,
              gsm,
              status,
              data,
              hora_contato_inicio,
              hora_contato_resposta,
              hora_contato_final,
              duracao_chamada,
              operador,
              observacao,
              classificacao,
              id_user
            ) VALUES ${arrayResultados.map((value) => db.escape(value)).join(",")}
            `;

          await conn.execute(query);
          arrayResultados.length = 0;
        }
        totalResultados--;
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
