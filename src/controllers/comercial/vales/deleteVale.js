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
        throw new Error("ID do vale não informado!");
      }
      // ! Exclusão de vale:
      await conn.execute(`DELETE FROM vales WHERE id = ?`, [id]);
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "DELETE_VALE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
