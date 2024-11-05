const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function conciliacaoTransferenciaContas(req) {
  return new Promise(async (resolve, reject) => {
    const { id_entrada, id_saida, id_conta_bancaria, valor } = req.body;
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      if (!id_entrada) {
        throw new Error("A tranferência da entrada não foi informada!");
      }
      if (!id_saida) {
        throw new Error("A tranferência da saída não foi informada!");
      }
      if (!id_conta_bancaria) {
        throw new Error("A conta bancária não foi informada!");
      }
      if (!valor) {
        throw new Error("O valor não foi informado!");
      }
      //* Cricação da conciliação
      const [resultConciliacao] = await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria, modulo) VALUES (?,?,?,?);`,
        [req.user.id, "MANUAL", id_conta_bancaria, "CR"]
      );
      const newIdConciliacao = resultConciliacao.insertId;
      if (!newIdConciliacao) {
        throw new Error("Falha ao inserir a conciliação!");
      }

      //* Adiciona o extrato CREDIT
      await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?);`,
        [newIdConciliacao, id_entrada, valor, "transacao"]
      );

      //* Adiciona o extrato DEBIT
      await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?)`,
        [newIdConciliacao, id_saida, valor, "transacao"]
      );

      await conn.commit();

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CP",
        method: "LANCAMENTO_TARIFAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
