const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const id_conta = req.params.id;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const { tipo_list, descricao, range_data } = filters || {};
    let where = ` WHERE eb.id_conta_bancaria = ? `;
    const params = [id_conta];

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data = `eb.data_transacao`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }

    if (descricao) {
      where += ` AND eb.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }

    if (tipo_list && tipo_list.length > 0) {
      where += ` AND eb.tipo_transacao IN (${tipo_list
        .map((value) => db.escape(value))
        .join(",")}) `;
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [rowsContasBancarias] = await conn.execute(
        `
        SELECT cb.id, cb.descricao as conta, cb.saldo, f.id_matriz, cb.data_fechamento
        FROM fin_contas_bancarias cb
        LEFT JOIN filiais f ON f.id = cb.id_filial
        WHERE cb.id = ?
        `,
        [id_conta]
      );
      const contasBancaria = rowsContasBancarias && rowsContasBancarias[0];

      const [rowQtdeTotal] = await conn.execute(
        `SELECT
            COUNT(eb.id) as qtde
            FROM fin_extratos_bancarios eb
            ${where} `,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [rowsMovimentacaoCaixa] = await conn.execute(
        `SELECT eb.*,
        CASE WHEN eb.data_transacao > cb.data_fechamento
        AND (eb.adiantamento OR eb.suprimento)
        AND eb.id_titulo_adiantamento IS NULL
        THEN TRUE ELSE FALSE END as allowAction
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        ${where}
        ORDER BY eb.data_transacao DESC, id DESC
        ${limit}`,
        params
      );

      const objResponse = {
        ...contasBancaria,
        movimentacao_caixa: rowsMovimentacaoCaixa,
        movimentacao_caixa_qtde: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
