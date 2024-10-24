const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const id_extrato = req.params.id;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let conn;
    try {
      conn = await db.getConnection();
      if (!id_extrato) {
        throw new Error("ID do extrato não informado!");
      }

      await conn.beginTransaction();
      const [rowTransacao] = await conn.execute(
        "SELECT valor, id_conta_bancaria FROM fin_extratos_bancarios WHERE id = ?",
        [id_extrato]
      );
      const transacao = rowTransacao && rowTransacao[0];
      if (!transacao) {
        throw new Error("Transacao não encontrada!");
      }

      const valorAnteriorTransacao = parseFloat(transacao.valor);
      const id_conta_bancaria = transacao.id_conta_bancaria;

      await conn.execute("DELETE FROM fin_extratos_bancarios WHERE id = ?", [id_extrato]);

      //* ATUALIZA O VALOR DO SALDO DA CONTA BANCÁRIA
      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: valorAnteriorTransacao * -1,
          conn,
        },
      });

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "DELETE_TRANSACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
