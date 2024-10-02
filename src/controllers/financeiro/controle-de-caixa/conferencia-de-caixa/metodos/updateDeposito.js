const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");
const updateSaldo = require("./updateSaldo");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, id_caixa, id_conta_bancaria, valor, comprovante, data_deposito } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_caixa) {
        throw new Error("É necessário informar o caixa!");
      }
      if (!(id_conta_bancaria && valor && comprovante && data_deposito)) {
        throw new Error("Todos os campos são obrigatórios!");
      }
      await conn.beginTransaction();

      const [rowsCaixas] = await conn.execute(
        "SELECT id, status, data FROM datasys_caixas WHERE id = ?",
        [id_caixa]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      if (caixa.status === "CONFIRMADO") {
        throw new Error("Não há como atualizar depósitos neste caixa");
      }

      const [rowsDepositos] = await conn.execute(
        "SELECT id_conta_bancaria, id_transacao_criada, valor as valor_anterior FROM datasys_caixas_depositos WHERE id = ?",
        [id]
      );
      const deposito = rowsDepositos && rowsDepositos[0];

      //* SE FOR UMA CONTA CAIXA
      if (deposito.id_transacao_criada) {
        await conn.execute("UPDATE fin_extratos_bancarios SET valor = ? WHERE id = ?", [
          valor,
          deposito.id_transacao_criada,
        ]);
        const valorAtualizado = parseFloat(valor) - parseFloat(deposito.valor_anterior);

        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria: deposito.id_conta_bancaria,
            valor: valorAtualizado,
            conn_externa: conn,
          },
        });
      }

      await conn.execute(
        `UPDATE datasys_caixas_depositos SET id_caixa = ?, id_conta_bancaria = ?, data_deposito = ?, comprovante = ?, valor = ? WHERE id = ?;`,
        [id_caixa, id_conta_bancaria, startOfDay(data_deposito), comprovante, parseFloat(valor), id]
      );
      await updateSaldo({ conn, id_caixa });

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "UPDATE_DEPOSITO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
