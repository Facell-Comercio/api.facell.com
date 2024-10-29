const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const getOneCampanha = require("./getOneCampanha");

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { id_campanha } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
      const campanha = await getOneCampanha({
        params: { id: id_campanha },
        body: {
          conn_externa: conn,
        },
      });

      console.log(campanha);

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "IMPORT_CAMPANHA_EVOLUX",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
