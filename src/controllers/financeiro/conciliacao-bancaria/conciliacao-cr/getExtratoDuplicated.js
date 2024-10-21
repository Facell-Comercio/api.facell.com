const { format, startOfDay } = require("date-fns");
const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { normalizeDate } = require("../../../../helpers/mask");

module.exports = function getExtratoDuplicated(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters } = req.query;
    const { id_conta_bancaria, descricao, data_transacao, valor, id_extrato } = filters || {};

    let conn;

    try {
      if (!id_conta_bancaria) {
        throw new Error("Conta Bancária não informada");
      }
      if (!descricao) {
        throw new Error("Descrição não informada");
      }
      if (!data_transacao) {
        throw new Error("Data da transação não informada");
      }
      if (!valor) {
        throw new Error("Valor não informado");
      }
      if (!id_extrato) {
        throw new Error("ID do extrato não informado");
      }

      conn = await db.getConnection();

      const [extratos] = await conn.execute(
        `
        SELECT
            eb.id, eb.documento, eb.descricao, ABS(eb.valor) as valor, eb.data_transacao,
            cb.descricao as conta_bancaria
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        LEFT JOIN fin_conciliacao_bancaria_itens cbi
                ON cbi.id_item = eb.id
                AND cbi.tipo = "transacao"
        WHERE eb.id_conta_bancaria = ?
        AND eb.descricao = ?
        AND ABS(eb.valor) = ?
        AND eb.data_transacao = ?
        AND eb.tipo_transacao = "CREDIT"
        AND eb.id <> ?
        AND cbi.id IS NOT NULL
      `,
        [id_conta_bancaria, descricao, parseFloat(valor), startOfDay(data_transacao), id_extrato]
      );

      resolve(extratos);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "GET_EXTRATOS_DUPLICATED",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
