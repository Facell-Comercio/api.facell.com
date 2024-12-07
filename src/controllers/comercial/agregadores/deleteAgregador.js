const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function deleteAgregador(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      // ! Exclusão de agregador:
      await conn.execute(`DELETE FROM metas_agregadores WHERE id = ?`, [id]);
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "DELETE_AGREGADOR",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
