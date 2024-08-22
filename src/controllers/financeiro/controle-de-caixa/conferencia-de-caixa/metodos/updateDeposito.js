const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_caixa,
      id_conta_bancaria,
      valor,
      comprovante,
      data_deposito,
    } = req.body;

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
        `
        SELECT id, status FROM datasys_caixas
        WHERE id = ?
        AND (status = 'BAIXADO / PENDENTE DATASYS' OR status = 'BAIXADO NO DATASYS')
      `,
        [id_caixa]
      );

      if (rowsCaixas && rowsCaixas.length > 0) {
        throw new Error("Os depósitos não podem ser atualizados nesse caixa");
      }

      const [rowsDepositosCaixa] = await conn.execute(
        "SELECT valor as valor_anterior FROM datasys_caixas_depositos WHERE id = ?",
        [id]
      );
      const deposito = rowsDepositosCaixa && rowsDepositosCaixa[0];
      const diferenca = deposito.valor_anterior - valor;

      await conn.execute(
        "UPDATE datasys_caixas SET saldo = saldo + ? WHERE id = ?",
        [parseFloat(diferenca), id_caixa]
      );

      await conn.execute(
        `UPDATE datasys_caixas_depositos SET id_caixa = ?, id_conta_bancaria = ?, data_deposito = ?, comprovante = ?, valor = ? WHERE id = ?;`,
        [
          id_caixa,
          id_conta_bancaria,
          startOfDay(data_deposito),
          comprovante,
          parseFloat(valor),
          id,
        ]
      );

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "UPDATE_DEPOSITO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
