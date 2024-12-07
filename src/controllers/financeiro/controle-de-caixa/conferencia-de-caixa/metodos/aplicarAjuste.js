const { logger } = require("../../../../../../logger");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../../helpers/hasPermission");
const updateSaldo = require("./updateSaldo");

module.exports = async ({ conn, id_ajuste, req }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowsAjustes] = await conn.execute(
        "SELECT * FROM datasys_caixas_ajustes WHERE id = ?",
        [id_ajuste]
      );
      const ajuste = rowsAjustes && rowsAjustes[0];
      if (
        ajuste.tipo_ajuste !== "transferencia" &&
        !(checkUserDepartment(req, "FINANCEIRO", true) || hasPermission(req, "MASTER"))
      ) {
        throw new Error("Você não tem permissão para aplicar este ajuste!");
      }

      if (ajuste.saida) {
        const [rowsCaixas] = await conn.execute(
          `SELECT ${ajuste.saida} as valor FROM datasys_caixas WHERE id = ?`,
          [ajuste.id_caixa]
        );
        const caixaValorSaida = rowsCaixas && rowsCaixas[0] && rowsCaixas[0].valor;

        //* Valida se há saldo para retirada
        if (parseFloat(caixaValorSaida) < parseFloat(ajuste.valor)) {
          throw new Error("Saldo insuficiente para retirada!");
        }

        await conn.execute(
          `
          UPDATE datasys_caixas
            SET ${
              ajuste.saida === "valor_dinheiro"
                ? `valor_despesas = valor_despesas + ?`
                : `${ajuste.saida} = ${ajuste.saida} - ?`
            }
            WHERE id = ?;
        `,
          ajuste.saida === "valor_dinheiro"
            ? [ajuste.valor, ajuste.id_caixa]
            : [ajuste.valor, ajuste.id_caixa]
        );
      }

      if (ajuste.entrada) {
        await conn.execute(
          `
          UPDATE datasys_caixas
            SET ${ajuste.entrada} = ${ajuste.entrada} + ?
            WHERE id = ?;
        `,
          [ajuste.valor, ajuste.id_caixa]
        );
      }
      await updateSaldo({ conn, id_caixa: ajuste.id_caixa });

      await conn.execute(
        `
        UPDATE datasys_caixas_ajustes 
        SET id_user_aprovador = ?,
        data_aprovacao = ?
        WHERE id = ?`,
        [req.user.id, new Date(), id_ajuste]
      );

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "APLICAR_AJUSTE",
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
