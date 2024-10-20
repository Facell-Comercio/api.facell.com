const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");
const updateSaldo = require("./updateSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id } = req.params;

    let conn;
    try {
      if (!id) {
        throw new Error("ID não informado");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowsCaixas] = await conn.execute(
        `SELECT dc.id, dc.status, dc.data
        FROM datasys_caixas_depositos dcd
        LEFT JOIN datasys_caixas dc ON dc.id = dcd.id_caixa
        WHERE dcd.id = ?`,
        [id]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      if (caixa.status === "CONFIRMADO") {
        throw new Error("Não há como deletar depósitos neste caixa");
      }
      const [rowDeposito] = await conn.execute(
        `SELECT id, id_caixa, id_conta_bancaria, id_transacao_criada, valor FROM datasys_caixas_depositos WHERE id = ?`,
        [id]
      );
      const deposito = rowDeposito && rowDeposito[0];
      if (!deposito) {
        throw new Error("Depósito não localizado!");
      }
      //* SE FOR UMA CONTA CAIXA
      if (deposito.id_transacao_criada) {
        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria: deposito.id_conta_bancaria,
            valor: -parseFloat(deposito.valor),
            conn,
          },
        });

        await conn.execute("DELETE FROM fin_extratos_bancarios WHERE id = ?", [
          deposito.id_transacao_criada,
        ]);
      }

      await conn.execute(`DELETE FROM datasys_caixas_depositos WHERE id = ?`, [id]);

      await updateSaldo({ conn, id_caixa: deposito.id_caixa });

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "DELETE_DEPOSITO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
