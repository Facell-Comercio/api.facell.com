const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    const { id } = req.params || {};

    let conn;

    try {
      conn = conn_externa || (await db.getConnection());

      const [rowCampanha] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id = ?`,
        [id]
      );
      const campanha = rowCampanha && rowCampanha[0];

      const [clientes] = await conn.execute(
        `SELECT * FROM marketing_mailing_clientes WHERE id_campanha = ?`,
        [id]
      );

      campanha.clientes = clientes;

      const [subcampanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?`,
        [id]
      );
      campanha.subcampanhas = subcampanhas;

      const nomes_subcampanhas =
        subcampanhas && subcampanhas.map((subcampanha) => subcampanha.nome);
      campanha.nomes_subcampanhas = nomes_subcampanhas;

      resolve(campanha);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
