const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function conciliacaoTransferenciaContas(req) {
  return new Promise(async (resolve, reject) => {
    const { id_extrato, id_duplicidade } = req.body;
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      if (!id_extrato) {
        throw new Error("O id do extrato não foi informado!");
      }
      if (!id_duplicidade) {
        throw new Error("O id do extrato duplicado não foi informado!");
      }

      //* Tratar Duplicidade
      await conn.execute(
        `UPDATE fin_extratos_bancarios SET id_duplicidade = ? WHERE id = ?`,
        [id_duplicidade, id_extrato]
      );

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "LANÇAMENTO TARIFAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
