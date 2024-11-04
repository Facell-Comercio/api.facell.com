const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { id } = req.params || {};

      conn = conn_externa || (await db.getConnection());

      const [rowCampanha] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id = ?`,
        [id]
      );
      const campanha = rowCampanha && rowCampanha[0];

      if (!campanha) {
        throw new Error(`Campanha não encontrada`);
      }

      const [allClientes] = await conn.execute(
        `
        SELECT DISTINCT mc.*
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_mailing_campanhas c ON mc.id_campanha = c.id OR mc.id_campanha IN (
            SELECT id FROM marketing_mailing_campanhas WHERE id_parent = ?
        )
        WHERE c.id = ?`,
        [id, id]
      );

      campanha.all_clientes = allClientes;
      campanha.qtde_all_clientes = allClientes?.length || 0;

      resolve(campanha);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CAMPANHA_GSMS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
