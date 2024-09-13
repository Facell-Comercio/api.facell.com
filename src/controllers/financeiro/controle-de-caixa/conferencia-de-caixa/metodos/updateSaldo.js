const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");
// const getCaixaAnterior = require("./getCaixaAnterior");

// Responsabilidade:
// Atualizar o Saldo do Caixa com base em:
  // (Entradas + Ajuste Manual) - (Retiradas + Ajuste Manual + Depósitos + Participação em Boletos)
module.exports = async ({ conn, id_caixa }) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Obtem dados do Caixa
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

      // Obtem dados do Caixa anterior
      // const caixaAnterior = await getCaixaAnterior({
      //   conn,
      //   id_filial: caixa.id_filial,
      //   data_caixa: startOfDay(caixa.data),
      // });

      // ^ Obtem os Depósitos do caixa:
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
      const valor_depositos = rowsDepositosCaixa.reduce(
        (acc, row) => acc + parseFloat(row.valor),
        0
      )

      const [rowsBoletosCaixa] = await conn.execute(
        `
        SELECT 
          bc.valor
        FROM datasys_caixas_boletos_caixas bc
        WHERE bc.id_caixa = ?
        `,
        [id_caixa]
      );
      const valor_em_boleto = rowsBoletosCaixa.reduce(
        (acc, row) => acc + parseFloat(row.valor),
        0
      )

      // Calcula o saldo anterior:
      // const saldo_anterior =
      //   caixa.saldo_anterior ||
      //   (caixaAnterior && caixaAnterior.saldo > 0 && caixaAnterior.saldo) ||
      //   "0";

      // Calula o saldo atual:
      const saldo_atual =
        // parseFloat(saldo_anterior) +
        parseFloat(caixa.valor_dinheiro) - (parseFloat(caixa.valor_retiradas) + valor_depositos + valor_em_boleto);

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
