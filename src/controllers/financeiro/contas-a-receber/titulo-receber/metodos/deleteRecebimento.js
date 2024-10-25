const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");
const updateValorVencimento = require("./updateValorVencimento");
const {
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeDate,
} = require("../../../../../helpers/mask");
module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { id } = req.params;
      const { user } = req;

      await conn.beginTransaction();

      if (!id) {
        throw new Error("ID não informado!");
      }

      //* Obtém o id_conta_bancaria do recebimento
      const [rowRecebimento] = await conn.execute(
        `
        SELECT
          tr.id_conta_bancaria, tr.id_extrato, tr.valor,
          tr.id_vencimento, tv.id_titulo, tv.data_vencimento
        FROM fin_cr_titulos_recebimentos tr
        LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id = tr.id_vencimento
        WHERE tr.id = ?`,
        [id]
      );
      const recebimento = rowRecebimento && rowRecebimento[0];

      //* Deleta o recebimento
      await conn.execute("DELETE FROM fin_cr_titulos_recebimentos WHERE id = ?", [id]);

      //* Obtém os dados da conta bancária
      const [rowContaBancaria] = await conn.execute(
        "SELECT caixa FROM fin_contas_bancarias WHERE id = ?",
        [recebimento.id_conta_bancaria]
      );
      const contaBancaria = rowContaBancaria && rowContaBancaria[0];

      //* Se for uma tesouraria realiza os procedimentos abaixo
      if (contaBancaria.caixa) {
        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria: recebimento.id_conta_bancaria,
            valor: -recebimento.valor,
            conn,
          },
        });
      }

      //* Deduzir valor do vencimento
      await updateValorVencimento({
        body: {
          id: recebimento.id_vencimento,
          valor: -recebimento.valor,
          conn_externa: conn,
        },
      });

      //* Adição de histórico no título
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}\n`;
      historico += `RETIRADO ${normalizeCurrency(
        recebimento.valor
      )} DO VENCIMENTO DE DATA ${normalizeDate(recebimento.data_vencimento)}\n`;

      await conn.execute(
        `INSERT INTO fin_cr_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
        [recebimento.id_titulo, historico]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "DELETE_RECEBIMENTO",
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
