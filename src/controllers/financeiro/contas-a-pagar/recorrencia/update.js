const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function updateRecorrencia(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      const { data_vencimento, valor } = req.body;
  
      const conn = await db.getConnection();
  
      await conn.beginTransaction();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
        if (!data_vencimento) {
          throw new Error("DATA DE VENCIMENTO não informada!");
        }
  
        await conn.execute(
          `UPDATE fin_cp_titulos_recorrencias SET data_vencimento = ?, valor = ? WHERE id = ? LIMIT 1`,
          [new Date(data_vencimento), valor, id]
        );
  
        await conn.commit();
        resolve(true);
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "UPDATE_RECORRENCIA",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
  
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }