const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id, recebimentos: itensConciliacao, transacoes, id_conta_bancaria } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_conta_bancaria) {
        throw new Error("É necessário informar uma conta bancária!");
      }
      const itensConciliacaoSoma = itensConciliacao.reduce(
        (acc, item) => acc + parseFloat(item.valor),
        0
      );
      const transacoesSoma = transacoes.reduce((acc, item) => acc + parseFloat(item.valor), 0);

      // ^ Verificando os valores de recebimentos e transações batem
      if (itensConciliacaoSoma.toFixed(2) !== transacoesSoma.toFixed(2)) {
        throw new Error("A soma dos recebimentos e das transações não batem!");
      }
      await conn.beginTransaction();

      // ^ Realiza a conciliação do tipo MANUAL
      const [result] = await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria, modulo) VALUES (?,?,?,?);`,
        [req.user.id, "MANUAL", id_conta_bancaria, "CR"]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir a conciliação!");
      }

      // ^ Adiciona todas as transações nos itens da conciliação bancária
      for (const item of itensConciliacao) {
        await conn.execute(
          `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?);`,
          [newId, item.id_recebimento, item.valor, "recebimento"]
        );
      }

      for (const transacao of transacoes) {
        await conn.execute(
          `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?);`,
          [newId, transacao.id, transacao.valor, "transacao"]
        );
      }
      await conn.commit();

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "CONCILIACAO_MANUAL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
