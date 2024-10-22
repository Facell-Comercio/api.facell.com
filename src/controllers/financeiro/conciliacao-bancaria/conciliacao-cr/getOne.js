const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const {
  getAllRecebimentos,
} = require("../../contas-a-receber/recebimentos/recebimentos-controller");
const getAllTransacoesBancariasCR = require("./getAllTransacoesBancariasCR");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      const [rowConciliacao] = await conn.execute(
        `
          SELECT 
            u.nome as responsavel, cb.created_at as data_conciliacao, cb.tipo
          FROM fin_conciliacao_bancaria cb
          LEFT JOIN users u ON u.id = cb.id_user
          WHERE cb.id = ?
        `,
        [id]
      );
      const conciliacao = rowConciliacao && rowConciliacao[0];
      if (!conciliacao) {
        throw new Error("Conciliação não encontrada!");
      }

      const { rows: recebimentosConciliados } = await getAllRecebimentos({
        query: {
          filters: { id_conciliacao: id },
          em: true,
          emConciliacao: true,
          pago: true,
          minStatusTitulo: 4,
          id_conciliacao: id,
          orderBy: "ORDER BY tv.data_pagamento DESC",
        },
      });

      const { rows: transacoesConciliadas } = await getAllTransacoesBancariasCR({
        query: {
          filters: { id_conciliacao: id },
          emConciliacao: true,
        },
      });

      const objResponse = {
        id,
        data_conciliacao: conciliacao.data_conciliacao,
        tipo: conciliacao.tipo,
        responsavel: conciliacao.responsavel,
        recebimentos: recebimentosConciliados,
        transacoes: transacoesConciliadas,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
