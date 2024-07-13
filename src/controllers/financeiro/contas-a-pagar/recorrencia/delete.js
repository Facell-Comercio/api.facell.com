const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function deleteRecorrencia(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
  
      const conn = await db.getConnection();
  
      await conn.beginTransaction();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
  
        await conn.execute(
          `DELETE FROM fin_cp_titulos_recorrencias WHERE id = ? LIMIT 1`,
          [id]
        );
  
        await conn.commit();
        resolve(true);
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "DELETE_RECORRENCIA",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }