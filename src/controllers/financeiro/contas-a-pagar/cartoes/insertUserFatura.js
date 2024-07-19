const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function insertUserFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id_cartao, id_user } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id_cartao) {
        throw new Error("ID do cartão não informado!");
      }
      if (!id_user) {
        throw new Error("ID do usuário não informado!");
      }

      const [user] = await conn.execute(
        "SELECT id FROM users_cartoes_corporativos WHERE id_cartao = ? AND id_user = ?",
        [id_cartao, id_user]
      );
      if (user && user.length > 0) {
        throw new Error(
          "Já existe um cartão associado ao usuário para esta fatura!"
        );
      }

      await conn.execute(
        `INSERT INTO users_cartoes_corporativos (id_cartao, id_user) VALUES (?, ?)`,
        [id_cartao, id_user]
      );

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "INSERT_USER_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
