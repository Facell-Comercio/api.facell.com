const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const getOneCampanha = require("./getOneCampanha");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { id_campanha, filters } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
      const campanha = await getOneCampanha({
        params: { id: id_campanha },
        query: { filters },
        body: {
          conn_externa: conn,
        },
      });

      //* DELETANDO CLIENTES DA CAMPANHA
      for (const cliente of campanha.clientes) {
        await conn.execute("DELETE FROM marketing_mailing_clientes WHERE id = ?", [cliente.id]);
      }
      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "DELETE_CLIENTES_CAMPANHA_LOTE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
