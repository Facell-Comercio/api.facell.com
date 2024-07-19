const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

function getAllTransacoesBancarias(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters, emConciliacao, orderBy } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    let where = ` WHERE 1=1 `;
    let order = orderBy || "ORDER BY eb.data_transacao DESC";
    // Somente o Financeiro/Master podem ver todos

    const { id_transacao, range_data, id_conta_bancaria, id_conciliacao } =
      filters || {};

    const params = [];

    if (id_transacao) {
      where += ` AND eb.id = ? `;
      params.push(id_transacao);
    }
    if (id_conta_bancaria) {
      where += ` AND eb.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }
    if (id_conciliacao) {
      where += ` AND cbi.id_conciliacao = ? `;
      params.push(id_conciliacao);
    }

    // Determina o retorno com base se está ou não em conciliação
    if (emConciliacao !== undefined) {
      if (emConciliacao) {
        where += ` AND cbi.id IS NOT NULL`;
      } else {
        where += ` AND cbi.id IS NULL`;
      }
    }

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND eb.data_transacao BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND eb.data_transacao >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND eb.data_transacao <= '${data_ate.split("T")[0]}' `;
        }
      }
    }

    const conn = await db.getConnection();
    try {
      const queryQtdeTotal = `SELECT COUNT(*) AS qtde
        FROM (
            SELECT DISTINCT
                eb.id
            FROM fin_extratos_bancarios eb
            LEFT JOIN fin_conciliacao_bancaria_itens cbi 
                ON cbi.id_item = eb.id
                AND cbi.tipo = "transacao"
            LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
            ${where}
            AND tipo_transacao = 'DEBIT'
        ) as subconsulta
        `;
      const [rowQtdeTotal] = await conn.execute(queryQtdeTotal, params);
      const totalTransacoes = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      let limit = "";
      if (pagination !== undefined) {
        limit = " LIMIT ? OFFSET ?";
        params.push(pageSize);
        params.push(offset);
      }

      var query = `
        SELECT DISTINCT
            cbi.id as id_conciliacao, eb.id, eb.id_transacao, eb.documento as doc,
            ABS(eb.valor) as valor, eb.data_transacao, eb.descricao, cb.descricao as conta_bancaria
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_conciliacao_bancaria_itens cbi 
            ON cbi.id_item = eb.id
            AND cbi.tipo = "transacao"
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        ${where}
        AND tipo_transacao = 'DEBIT'
        ${order}
        ${limit}
        `;
      // console.log(query);
      // console.log(params);
      const [transacoes] = await conn.execute(query, params);

      const objResponse = {
        rows: transacoes,
        pageCount: Math.ceil(totalTransacoes / pageSize),
        rowCount: totalTransacoes,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIAÇÃO BANCÁRIA",
        method: "GET_ALL_TRANSACOES_BANCARIAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAllTransacoesBancarias,
};
