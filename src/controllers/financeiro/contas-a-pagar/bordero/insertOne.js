const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, id_conta_bancaria, data_pagamento, itens } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
        [new Date(data_pagamento), id_conta_bancaria]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      // Inserir os itens do bordero
      for (const item of itens) {
        if (item.id_forma_pagamento === 6) {
          const [rowVencimento] = await conn.execute(
            `SELECT id FROM fin_cp_bordero_itens WHERE id_fatura = ?`,
            [item.id_vencimento]
          );
          if (rowVencimento.length === 0) {
            // console.log(item.id_vencimento, newId);
            await conn.execute(
              `INSERT INTO fin_cp_bordero_itens (id_fatura, id_bordero) VALUES(?,?)`,
              [item.id_vencimento, newId]
            );
          }
        } else {
          const [rowVencimento] = await conn.execute(
            `SELECT id FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
            [item.id_vencimento]
          );
          if (rowVencimento.length === 0) {
            await conn.execute(
              `INSERT INTO fin_cp_bordero_itens (id_vencimento, id_bordero) VALUES(?,?)`,
              [item.id_vencimento, newId]
            );
          }
        }
      }

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "INSERT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
