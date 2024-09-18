const { logger } = require("../../../../../../logger");
const updateSaldo = require("./updateSaldo");

module.exports = async ({ conn, id_ajuste }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowsAjustes] = await conn.execute(
        "SELECT * FROM datasys_caixas_ajustes WHERE id = ?",
        [id_ajuste]
      );
      const ajuste = rowsAjustes && rowsAjustes[0];

      if (ajuste.saida) {
        await conn.execute(
          `
          UPDATE datasys_caixas
            SET ${ajuste.saida} = ${ajuste.saida} + ?,
            ${ajuste.saida === "valor_dinheiro" && `valor_despesas = valor_despesas - ?`}
            WHERE id = ?;
        `,
          ajuste.saida === "valor_dinheiro"
            ? [ajuste.valor, ajuste.valor, ajuste.id_caixa]
            : [ajuste.valor, ajuste.id_caixa]
        );
      }

      if (ajuste.entrada) {
        const [rowsCaixas] = await conn.execute(
          `SELECT ${ajuste.entrada} as valor FROM datasys_caixas WHERE id = ?`,
          [ajuste.id_caixa]
        );
        const caixaValorEntrada = rowsCaixas && rowsCaixas[0] && rowsCaixas[0].valor;

        //* (DUPLA VALIDAÇÃO) - Valida se há saldo para retirada
        if (parseFloat(caixaValorEntrada) < parseFloat(ajuste.valor)) {
          throw new Error("Saldo insuficiente para retirada!");
        }

        await conn.execute(
          `
          UPDATE datasys_caixas
            SET ${ajuste.entrada} = ${ajuste.entrada} - ?
            WHERE id = ?;
        `,
          [ajuste.valor, ajuste.id_caixa]
        );
      }

      await updateSaldo({ conn, id_caixa: ajuste.id_caixa });

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "DESFAZER_AJUSTE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
