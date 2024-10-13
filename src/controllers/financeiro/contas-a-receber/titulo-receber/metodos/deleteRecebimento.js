const { startOfDay } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");
module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { id } = req.params;

      conn = await db.getConnection();
      await conn.beginTransaction();

      if (!id) {
        throw new Error("ID não informado!");
      }

      //* Obtém o id_conta_bancaria do recebimento
      const [rowRecebimento] = await conn.execute(
        "SELECT id_conta_bancaria, id_extrato, valor FROM fin_cr_titulos_recebimentos WHERE id = ?",
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
        await conn.execute("DELETE FROM fin_extratos_bancarios WHERE id = ?", [
          recebimento.id_extrato,
        ]);
      }

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
