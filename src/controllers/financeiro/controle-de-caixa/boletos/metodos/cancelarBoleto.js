const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id } = req.body;
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowsBoletos] = await conn.execute(
        "SELECT * FROM datasys_caixas_boletos WHERE id = ?",
        [id]
      );
      const boleto = rowsBoletos && rowsBoletos[0];
      if (boleto && boleto.status === "cancelado") {
        throw new Error("Este boleto já está cancelado.");
      }
      if (boleto && boleto.status === "em_pagamento") {
        throw new Error("Este boleto está em pagamento.");
      }
      if (boleto && boleto.status === "pago") {
        throw new Error("Este boleto já foi pago.");
      }

      await conn.execute(`UPDATE datasys_caixas_boletos SET status = 'cancelado' WHERE id = ?`, [
        id,
      ]);
      const [caixas] = await conn.execute(
        `
        SELECT valor, id_caixa
        FROM datasys_caixas_boletos_caixas
        WHERE id_boleto = ?
        `,
        [id]
      );

      for (const caixa of caixas) {
        await conn.execute(`UPDATE datasys_caixas SET saldo = saldo + ? WHERE id = ?;`, [
          caixa.valor,
          caixa.id_caixa,
        ]);
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_ONE_BOLETO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
