const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    const { id } = req.params || {};

    let conn;

    try {
      conn = conn_externa || (await db.getConnection());

      const [rowCliente] = await conn.execute(
        `SELECT * FROM marketing_mailing_clientes WHERE id = ?`,
        [id]
      );
      const cliente = rowCliente && rowCliente[0];

      resolve(cliente);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CLIENTE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
