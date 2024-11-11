const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function deleteItem(req) {
  return new Promise(async (resolve, reject) => {
    const { id, tipo } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      await conn.beginTransaction();

      if (tipo === "vencimento") {
        const [rowVencimento] = await conn.execute(
          `SELECT tv.*, t.id_status, tv.data_pagamento  
            FROM fin_cp_titulos t
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            WHERE tv.id = ?`,
          [id]
        );
        if (
          rowVencimento[0].id_status === 5 ||
          rowVencimento[0].data_pagamento
        ) {
          throw new Error("Não é possível remover do borderô itens pagos!");
        }
        if (tipo === "vencimento") {
          await conn.execute(
            `UPDATE fin_cp_titulos_vencimentos SET status = "pendente", obs = ? WHERE id = ?`,
            [null, id]
          );
        }
      }
      if (tipo === "fatura") {
        const [rowFatura] = await conn.execute(
          `SELECT tv.*, t.id_status, tv.data_pagamento  
            FROM fin_cp_titulos t
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            WHERE tv.id_fatura = ?`,
          [id]
        );
        if (rowFatura[0].id_status === 5 || rowFatura[0].data_pagamento) {
          throw new Error("Não é possível remover do borderô itens pagos!");
        }
        await conn.execute(
          `UPDATE fin_cartoes_corporativos_faturas SET status = "pendente", obs = ? WHERE id = ?`,
          [null, id]
        );
        await conn.execute(
          `UPDATE fin_cp_titulos_vencimentos SET status = "pendente", obs = ? WHERE id_fatura = ?`,
          [null, id]
        );
      }
      await conn.execute(
        `DELETE FROM fin_cp_bordero_itens WHERE ${
          tipo === "vencimento" ? "id_vencimento" : "id_fatura"
        } = ?`,
        [id]
      );

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "DELETE_VENCIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
