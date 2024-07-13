const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function deleteBordero(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
  
      const conn = await db.getConnection();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
  
        await conn.beginTransaction();
        const [vencimentos] = await conn.execute(
          `SELECT id, status FROM fin_cp_titulos_vencimentos tv 
          INNER JOIN fin_cp_titulo_bordero tb ON tb.id_vencimento = tv.id
          WHERE tb.id`,
          [id]
        );
  
        for (const vencimento of vencimentos) {
          if (vencimento.status == "pago" || vencimento.status == "programado") {
            throw new Error(
              "Não é possível deletar o borderô pois possui vencimento(s) pagos ou programados para pagamento!"
            );
          }
        }
  
        await conn.execute(`DELETE FROM fin_cp_bordero WHERE id = ? LIMIT 1`, [
          id,
        ]);
  
        await conn.commit();
        resolve({ message: "Sucesso!" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "DELETE_BORDERO",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }