const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function deleteVale(req) {
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
        throw new Error("ID do meta não informado!");
      }
      // ! Exclusão de meta:
      await conn.execute(`DELETE FROM facell_metas WHERE id = ?`, [id]);
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
        method: "DELETE_META",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
