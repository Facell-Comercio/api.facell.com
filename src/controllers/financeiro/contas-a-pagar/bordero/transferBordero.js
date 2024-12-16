const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function transferBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { id_conta_bancaria, date, vencimentos } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID_CONTA_BANCARIA novo não informado!");
      }
      if (!date) {
        throw new Error("DATA_PAGAMENTO novo não informado!");
      }
      if (vencimentos.length < 0) {
        throw new Error("VENCIMENTOS não informado!");
      }

      await conn.beginTransaction();

      const [rowBordero] = await conn.execute(
        `
          SELECT id 
          FROM fin_cp_bordero 
          WHERE data_pagamento = ?
          AND id_conta_bancaria = ?
      `,
        [new Date(date), id_conta_bancaria]
      );

      let id = (rowBordero[0] && rowBordero[0].id) || "";

      if (!id) {
        const [newBordero] = await conn.execute(
          `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
          [new Date(date), id_conta_bancaria]
        );
        id = newBordero.insertId;
      }

      for (const vencimento of vencimentos) {
        if (vencimento.id_status != 3) {
          throw new Error(
            "Não é possível realizar a transfência de vencimentos com status diferente de aprovado!"
          );
        }
        await conn.execute(
          `UPDATE fin_cp_bordero_itens SET id_bordero = ? WHERE id_vencimento =  ?`,
          [id, vencimento.id_vencimento]
        );
        await conn.execute(
          `UPDATE fin_cp_titulos_vencimentos SET data_prevista = ? WHERE id =  ?`,
          [new Date(date), vencimento.id_vencimento]
        );
      }

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "TRANSFER_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
