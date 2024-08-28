const { db } = require("../../../../../../mysql");
const {
  logger,
} = require("../../../../../../logger");
const { startOfDay } = require("date-fns");
const updateSaldo = require("./updateSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_caixa,
      id_conta_bancaria,
      valor,
      comprovante,
      data_deposito,
      conn_recebida,
    } = req.body;

    let conn;
    try {
      conn =
        conn_recebida ||
        (await db.getConnection());
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_caixa) {
        throw new Error(
          "É necessário informar o caixa!"
        );
      }
      if (
        !(
          id_conta_bancaria &&
          valor &&
          comprovante &&
          data_deposito
        )
      ) {
        throw new Error(
          "Todos os campos são obrigatórios!"
        );
      }
      await conn.beginTransaction();

      const [rowsCaixas] = await conn.execute(
        `
        SELECT id, status FROM datasys_caixas
        WHERE id = ?
        AND (status = 'BAIXADO / PENDENTE DATASYS' OR status = 'BAIXADO NO DATASYS')
      `,
        [id_caixa]
      );

      if (rowsCaixas && rowsCaixas.length > 0) {
        throw new Error(
          "Não poder ser inseridos depósitos nesse caixa"
        );
      }

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_depositos (id_caixa, id_conta_bancaria, data_deposito, comprovante, valor) VALUES (?,?,?,?,?);`,
        [
          id_caixa,
          id_conta_bancaria,
          startOfDay(data_deposito),
          comprovante,
          parseFloat(valor),
        ]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error(
          "Falha ao inserir o depósito!"
        );
      }

      await updateSaldo({ conn, id_caixa });

      if (!conn_recebida) {
        await conn.commit();
      }
      // await conn.rollback();
      resolve({ id: newId });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_DEPOSITO",
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
