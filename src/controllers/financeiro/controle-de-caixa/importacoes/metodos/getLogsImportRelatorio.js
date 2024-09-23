const XLSX = require("xlsx");
const fs = require("fs").promises;
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

      const { relatorios } = filters || {};

      conn = await db.getConnection();
      conn.config.namedPlaceholders = true;

      const offset = pageIndex * pageSize;

      let where = "1=1";
      let limit = "";
      const params = [];

      if (relatorios && relatorios.length > 0) {
        where += ` AND lir.relatorio IN('${relatorios.join("','")}')`;
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde FROM logs_movimento_arquivos lir
                LEFT JOIN users u ON u.id = lir.id_user
                WHERE ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      limit = " LIMIT ? OFFSET ? ";
      params.push(pageSize);
      params.push(offset);

      const [rows] = await conn.execute(
        `SELECT lir.*, u.nome as usuario
                FROM logs_movimento_arquivos lir 
                LEFT JOIN users u ON u.id = lir.id_user
                WHERE ${where}
                ORDER BY lir.id DESC
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
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_LOGS_IMPORTS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn) conn.release();
    }
  });
};
