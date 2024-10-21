const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const { termo } = filters || {};

      let where = "WHERE 1=1";
      const params = [];

      if (termo) {
        where += " AND descricao_comercial LIKE CONCAT('%',?, '%')";
        params.push(termo);
      }

      conn = conn_externa || (await db.getConnection());

      const [rowQtdeTotal] = await conn.execute(
        `SELECT id FROM tim_tabela_precos ${where} GROUP BY descricao_comercial`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal.length) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const [aparelhos] = await conn.execute(
        `SELECT DISTINCT
          descricao_comercial,
          descricao
        FROM tim_tabela_precos
        ${where}
        GROUP BY descricao_comercial
        ${limit}
        `,
        params
      );

      const objResponse = {
        rows: aparelhos,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ALL_APARELHOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
