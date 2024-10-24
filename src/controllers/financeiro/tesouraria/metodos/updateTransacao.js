const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { normalizeFirstAndLastName } = require("../../../../helpers/mask");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { descricao, valor, id, tipo } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID do extrato não informado!");
      }
      if (!descricao) {
        throw new Error("Descrição não informada!");
      }
      if (!valor) {
        throw new Error("Valor não informado!");
      }
      await conn.beginTransaction();

      const [rowTransacao] = await conn.execute(
        "SELECT ABS(valor) as valor, id_conta_bancaria, adiantamento FROM fin_extratos_bancarios WHERE id = ?",
        [id]
      );
      const transacao = rowTransacao && rowTransacao[0];
      if (!transacao) {
        throw new Error("Transacao não encontrada!");
      }
      const valorAnteriorTransacao = parseFloat(transacao.valor);
      const id_conta_bancaria = transacao.id_conta_bancaria;
      const isAdiantamento = !!transacao.adiantamento;

      // const updatedDescricao = `${descricao} (ATUALIZADO: ${normalizeFirstAndLastName(user.name)})`;
      await conn.execute(
        "UPDATE fin_extratos_bancarios SET descricao = ?, valor = ? WHERE id = ?",
        [descricao, isAdiantamento ? valor * -1 : valor, id]
      );

      //* ATUALIZA O VALOR DO SALDO DA CONTA BANCÁRIA
      const valorAtualizado = valor - valorAnteriorTransacao;
      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: isAdiantamento ? -1 * valorAtualizado : valorAtualizado,
          conn,
        },
      });

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "UPDATE_TRANSACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
