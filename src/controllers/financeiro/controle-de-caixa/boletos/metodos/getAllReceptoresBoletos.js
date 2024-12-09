const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const { id_filial, filiais_list, email } = filters || {};

      conn = await db.getConnection();

      const offset = pageIndex * pageSize;

      let where = "WHERE 1=1";
      const params = [];

      if (id_filial) {
        where += ` AND f.id = ?`;
        params.push(id_filial);
      }
      if (filiais_list && filiais_list?.length > 0) {
        where += ` AND f.id IN(${filiais_list.map((value) => db.escape(value)).join(",")})`;
      }

      if (email) {
        where += ` AND crb.email LIKE CONCAT('%', ?, '%')`;
        params.push(email);
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde FROM datasys_caixas_receptores_boletos crb
        INNER JOIN filiais f ON f.id = crb.id_filial
        ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = " LIMIT ? OFFSET ? ";
      params.push(pageSize);
      params.push(offset);

      const [rows] = await conn.execute(
        `SELECT 
            crb.*, f.nome as filial
        FROM datasys_caixas_receptores_boletos crb
        INNER JOIN filiais f ON f.id = crb.id_filial
        ${where}
        ORDER BY crb.id DESC
        ${limit}`,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_ALL_RECEPTORES_BOLETOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn) conn.release();
    }
  });
};
