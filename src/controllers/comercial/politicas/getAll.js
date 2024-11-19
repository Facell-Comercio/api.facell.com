const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { pagination } = req.query;

    const { pageIndex, pageSize } =
      pagination || {
        pageIndex: 0,
        pageSize: 15,
      };

    const params = [];

    let conn;
    try {
      conn = await db.getConnection();
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(id) as qtde FROM comissao_politica`
      );
      const qtdeTotal =
        (rowTotal &&
          rowTotal[0] &&
          rowTotal[0]["qtde"]) ||
        0;

      const limit = pagination
        ? " LIMIT ? OFFSET ? "
        : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [rows] = await conn.execute(
        `
        SELECT * FROM comissao_politica
        ORDER BY ref DESC
        ${limit}
        `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(
          qtdeTotal / pageSize
        ),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_ALL",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
