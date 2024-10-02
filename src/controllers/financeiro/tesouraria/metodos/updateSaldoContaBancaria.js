const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { conn_externa, valor, id_conta_bancaria } = req.body;

    let conn;
    try {
      conn = conn_externa || (await db.getConnection());

      await conn.execute(
        `
        UPDATE fin_contas_bancarias
        SET saldo = saldo + ?,
        data_saldo = CURDATE()
        WHERE id = ?`,
        [valor, id_conta_bancaria]
      );

      if (!conn_externa) {
        await conn.commit();
      }
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "UPDATE_SALDO_CONTA_BANCARIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
