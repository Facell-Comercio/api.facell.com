const { formatDate } = require("date-fns");
const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function conciliacaoAutomatica(req) {
  return new Promise(async (resolve, reject) => {
    let { vencimentos, transacoes, id_conta_bancaria } = req.body;
    let conn;
    try {
      conn = await db.getConnection();
      if (!id_conta_bancaria) {
        throw new Error("A conta bancária não foi informada!");
      }
      await conn.beginTransaction();
      const result = [];
      const vencimentosLength = vencimentos.length;
      for (let v = 0; v < vencimentosLength; v++) {
        const vencimento = vencimentos[v];
        // console.log(vencimento);
        let obj = {
          "ID TÍTULO": vencimento.id_titulo,
          "DESCRIÇÃO TÍTULO": vencimento.descricao,
          FORNECEDOR: vencimento.nome_fornecedor,
          FILIAL: vencimento.filial,
          CONCILIADO: "NÃO",
        };

        let indexTransacaoConciliada = -1;
        const transacoesLength = transacoes.length;
        for (let t = 0; t < transacoesLength; t++) {
          const transacao = transacoes[t];
          if (
            formatDate(vencimento.data_pagamento, "dd-MM-yyyy").toString() ==
              formatDate(transacao.data_transacao, "dd-MM-yyyy").toString() &&
            vencimento.valor == transacao.valor
          ) {
            //^ UPDATE do Vencimento
            const [result] = await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria (id_user, tipo, id_conta_bancaria) VALUES (?, ?, ?);`,
              [req.user.id, "AUTOMATICA", id_conta_bancaria]
            );
            const newId = result.insertId;
            if (!newId) {
              throw new Error("Falha ao inserir a conciliação!");
            }

            //^ INSERT registro conciliação item TRANSAÇÃO
            await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?, ?, ?);`,
              [newId, transacao.id, transacao.valor, "transacao"]
            );

            // ^ Adiciona o título nos itens da conciliação bancária
            await conn.execute(
              `INSERT INTO fin_conciliacao_bancaria_itens (id_conciliacao, id_item, valor, tipo) VALUES (?,?,?)`,
              [newId, vencimento.id_vencimento, vencimento.valor, "pagamento"]
            );

            obj = {
              ...obj,
              "DATA PAGAMENTO": formatDate(
                transacao.data_transacao,
                "dd/MM/yyyy"
              ),
              "VALOR PAGO": transacao.valor,
              "ID TRANSAÇÃO": transacao.id_transacao,
              "DESCRIÇÃO TRANSAÇÃO": transacao.descricao,
              DOC: transacao.doc,
              CONCILIADO: "SIM",
            };
            indexTransacaoConciliada = t;
            break;
          }
        }
        // Verificar se é diferente de -1
        if (indexTransacaoConciliada !== -1) {
          transacoes = transacoes.filter(
            (_, index) => index !== indexTransacaoConciliada
          );
        }
        result.push(obj);
      }

      await conn.commit();
      resolve(result);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "AUTOMATICA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
