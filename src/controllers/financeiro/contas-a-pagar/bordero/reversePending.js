const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, tipo } = req.body;
    let conn;

    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!tipo) {
        throw new Error("Tipo não informado!");
      }

      await conn.beginTransaction();

      const isFatura = tipo === "fatura";
      const updatedTable = isFatura
        ? "fin_cartoes_corporativos_faturas"
        : "fin_cp_titulos_vencimentos";

      const [rowPagamento] = await conn.execute(`SELECT status FROM ${updatedTable} WHERE id = ?`, [
        id,
      ]);
      const statusPagamento = rowPagamento && rowPagamento[0] && rowPagamento[0].status;
      if (statusPagamento === "pago") {
        throw new Error("Ação não permitida, pagamento já realizado!");
      }
      await conn.execute(
        `UPDATE ${updatedTable} 
        SET status = 'pendente', data_pagamento = NULL, tipo_baixa = NULL,
        valor_pago = NULL, obs = NULL
        WHERE id = ?`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "REVERSE_PENDING",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
