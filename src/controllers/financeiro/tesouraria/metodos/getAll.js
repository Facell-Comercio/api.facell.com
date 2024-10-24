const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
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
    const { id_grupo_economico, conta } = filters || {};
    let where = ` WHERE cb.active = 1 AND cb.caixa = 1 `;
    const params = [];

    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }

    if (conta) {
      where += ` AND cb.conta LIKE CONCAT(?,"%")`;
      params.push(conta);
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(cb.id) as qtde  
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial
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

      var query = `
            SELECT cb.id, cb.descricao as conta, cb.saldo
            FROM fin_contas_bancarias cb
            LEFT JOIN filiais f ON f.id = cb.id_filial
            ${where}
            ${limit}
            `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
