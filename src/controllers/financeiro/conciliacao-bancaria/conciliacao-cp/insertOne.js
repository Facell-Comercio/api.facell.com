const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      vencimentos: itensConciliacao,
      transacoes,
      data_pagamento,
      id_conta_bancaria,
    } = req.body;

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
        (acc, item) => acc + +item.valor_pago,
        0
      );
      const transacoesSoma = transacoes.reduce(
        (acc, item) => acc + +item.valor,
        0
      );
      // ^ Verificando os valores de títulos e transações batem
      if (itensConciliacaoSoma.toFixed(2) !== transacoesSoma.toFixed(2)) {
        throw new Error("A soma dos vencimentos e das transações não batem!");
      }
      await conn.beginTransaction();

      // ^ Realiza a conciliação do tipo MANUAL
      const [result] = await conn.execute(
        `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria) VALUES (?, ?, ?);`,
        [req.user.id, "MANUAL", id_conta_bancaria]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir a conciliação!");
      }

      // ^ Adiciona todas as transações nos itens da conciliação bancária
      for (const transacao of transacoes) {
        await conn.execute(
          `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?);`,
          [newId, transacao.id, transacao.valor, "transacao"]
        );
      }

      for (const item of itensConciliacao) {
        // ^ Adiciona o título nos itens da conciliação bancária
        //* No caso do item ser um vencimento
        if (item.tipo === "vencimento") {
          await conn.execute(
            `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?)`,
            [newId, item.id_vencimento, item.valor_pago, "pagamento"]
          );
        }
        //* No caso do item ser uma fatura
        if (item.tipo === "fatura") {
          await conn.execute(
            `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?,?)`,
            [newId, item.id_vencimento, item.valor_pago, "fatura"]
          );
        }
      }

      await conn.commit();
      // await conn.rollback();

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "INSERT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
