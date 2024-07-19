const { db } = require('../../../../../mysql');
const { logger } = require('../../../../../logger');

module.exports = function checkDoc(req) {
  return new Promise(async (resolve, reject) => {
    const { id_fornecedor, num_doc } = req.query;
    const conn = await db.getConnection();
    try {
      const [rowTitulo] = await conn.execute(
        `
          SELECT 
            t.id
          FROM fin_cp_titulos t 
          WHERE t.id_fornecedor = ? AND t.num_doc = ?
              `,
        [id_fornecedor, num_doc]
      );
      resolve(rowTitulo ? rowTitulo.length : 0);
      return;
    } catch (error) {
      logger.error({
        module: 'FINANCEIRO',
        origin: 'TITULOS A PAGAR',
        method: 'CHECK_DOC',
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
};
