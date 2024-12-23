const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const { filters, pagination } = req.query;
    const { termo } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    let where = ` WHERE 1=1 `;
    if (termo) {
      where += ` AND u.nome LIKE CONCAT("%",?,"%")`;
      params.push(termo);
    }
    let conn;
    try {
      conn = await db.getConnection();

      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
              FROM (
                SELECT 
                  u.id
                FROM permissoes p
                LEFT JOIN users_permissoes up ON up.id_permissao = p.id
                LEFT JOIN users u ON u.id = up.id_user
                ${where} 
                AND p.nome = "VALES:ABONAR"
              ) 
              as subconsulta
              `,
        params
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [rows] = await conn.execute(
        ` SELECT 
            u.id, u.nome, u.email, p.nome as permissao
          FROM permissoes p
          LEFT JOIN users_permissoes up ON up.id_permissao = p.id
          LEFT JOIN users u ON u.id = up.id_user
          ${where} 
          AND p.nome = "VALES:ABONAR"
          ${limit}
          `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "GET_ALL_USERS_PERMISSAO_ABONO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
