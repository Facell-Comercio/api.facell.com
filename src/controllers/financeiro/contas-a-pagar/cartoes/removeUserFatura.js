const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function removeUserFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.execute(
        `DELETE FROM users_cartoes_corporativos WHERE id = ?`,
        [id]
      );

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "REMOVE_USER_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
