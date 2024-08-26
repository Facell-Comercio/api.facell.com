const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");
const getCaixaAnterior = require("./getCaixaAnterior");

module.exports = async ({ conn, id_caixa }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowCaixas] = await conn.execute(
        `
        SELECT 
          dc.id_filial, dc.data, dc.valor_dinheiro, dc.valor_retiradas, dc.saldo_anterior
        FROM datasys_caixas dc
        WHERE id = ?
        `,
        [id_caixa]
      );
      const caixa = rowCaixas && rowCaixas[0];

      const caixaAnterior = await getCaixaAnterior({
        conn,
        id_filial: caixa.id_filial,
        data_caixa: startOfDay(caixa.data),
      });

      const [rowsDepositosCaixa] = await conn.execute(
        `
        SELECT 
          dcd.id, dcd.valor
        FROM datasys_caixas_depositos dcd
        LEFT JOIN fin_contas_bancarias cc ON cc.id = dcd.id_conta_bancaria
        WHERE dcd.id_caixa = ?
        `,
        [id_caixa]
      );

      const saldo_anterior = caixa.saldo_anterior || caixaAnterior && caixaAnterior.saldo > 0 && caixaAnterior.saldo || '0';
      const saldo_atual =
        parseFloat(saldo_anterior) +
        parseFloat(caixa.valor_dinheiro) -
        (parseFloat(caixa.valor_retiradas) +
          rowsDepositosCaixa.reduce(
            (acc, row) => acc + parseFloat(row.valor),
            0
          ));

      await conn.execute(
        `
        UPDATE datasys_caixas SET saldo = ? WHERE id = ?
      `,
        [saldo_atual.toFixed(2), id_caixa]
      );

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "UPDATE_SALDO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};
