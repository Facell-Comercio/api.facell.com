const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsEscalonamentos] =
        await conn.execute(
          "SELECT * FROM comissao_escalonamentos WHERE active"
        );

      resolve(rowsEscalonamentos);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_ESCALONAMENTOS",
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
