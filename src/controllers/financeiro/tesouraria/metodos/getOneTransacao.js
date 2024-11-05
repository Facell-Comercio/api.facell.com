const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id } = req.params;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID do extrato não informado!");
      }
      const [rowTransacao] = await conn.execute(
        "SELECT *, ABS(valor) as valor FROM fin_extratos_bancarios WHERE id = ?",
        [id]
      );
      const transacao = rowTransacao && rowTransacao[0];
      resolve(transacao);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "GET_ONE_TRANSACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
