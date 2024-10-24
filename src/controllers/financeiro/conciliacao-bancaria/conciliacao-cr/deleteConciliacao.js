const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function deleteConciliacao(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();

      //* Deleta a conciliação bancária
      await conn.execute(`DELETE FROM fin_conciliacao_bancaria WHERE id = ? LIMIT 1`, [id]);
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "DELETE_CONCILIACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
