const { logger } = require("../../../logger");
const { db } = require("../../../mysql");

function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex * pageSize;

    const { termo } = filters || {};

    var where = ` WHERE 1=1 `;
    var limit = pagination ? " LIMIT ? OFFSET ? " : "";

    const params = [];
    if (termo) {
      where += ` AND p.nome LIKE CONCAT('%', ?, '%') `;
      params.push(termo);
    }
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(p.id) as qtde 
            FROM permissoes p
             ${where} `,
        params
      );
      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      var query = `
            SELECT p.* FROM permissoes p
            ${where}
            
            ${limit}
            `;
      // console.log(query)
      // console.log(params)
      const [rows] = await conn.execute(query, params);

      // console.log('Fetched users', users.length)
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: 'ADM', origin: 'PERMISSÕES', method: 'GET_ALL',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const conn = await db.getConnection();
    try {
      const [rowPlanoContas] = await conn.execute(
        `
            SELECT *
            FROM users
            WHERE id = ?
            `,
        [id]
      );
      const planoContas = rowPlanoContas && rowPlanoContas[0];
      resolve(planoContas);
      return;
    } catch (error) {
      logger.error({
        module: 'ADM', origin: 'PERMISSÕES', method: 'GET_ONE',
        data: { message: error.message, stack: error.stack, name: error.name }
      })
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
}


module.exports = {
  getAll,
  getOne,
};
