const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id) {
        throw new Error(
          "ID do cargo não informado!"
        );
      }
      conn = await db.getConnection();
      await conn.execute(
        `DELETE FROM comissao_politica_cargos WHERE id = ?`,
        [id]
      );
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLITICA",
        method: "REMOVE_CARGO_POLÍTICA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
