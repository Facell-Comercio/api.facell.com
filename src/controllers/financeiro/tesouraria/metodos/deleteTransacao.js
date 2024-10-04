const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const id_extrato = req.params.id;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let conn;
    try {
      conn = await db.getConnection();
      if (!id_extrato) {
        throw new Error("ID do extrato não informado!");
      }
      await conn.execute("DELETE FROM fin_extratos_bancarios WHERE id = ?", [id_extrato]);

      //! ATUALIZAR SALDO DA CONTA

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "DELETE_TRANSACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
