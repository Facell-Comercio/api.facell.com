const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function deleteVencimento(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
  
      const conn = await db.getConnection();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
        await conn.beginTransaction();
  
        const [rowVencimento] = await conn.execute(
          `SELECT t.id_status, tv.data_pagamento  
          FROM fin_cp_titulos t
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
          WHERE tv.id = ?`,
          [id]
        );
  
        if (rowVencimento[0].id_status === 5 || rowVencimento[0].data_pagamento) {
          throw new Error("Não é possível remover do borderô vencimentos pagos!");
        }
  
        await conn.execute(
          `DELETE FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
          [id]
        );
  
        await conn.commit();
        resolve({ message: "Sucesso!" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "DELETE_VENCIMENTO",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }