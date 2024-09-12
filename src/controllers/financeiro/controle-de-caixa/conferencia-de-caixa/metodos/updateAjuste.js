const { db } = require("../../../../../../mysql");
const {
  logger,
} = require("../../../../../../logger");
const aplicarAjuste = require("./aplicarAjuste");
const desfazerAjuste = require("./desfazerAjuste");
const {
  checkUserDepartment,
} = require("../../../../../helpers/checkUserDepartment");
const {
  checkUserPermission,
} = require("../../../../../helpers/checkUserPermission");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_caixa,
      tipo_ajuste,
      saida,
      entrada,
      valor,
      obs,
      aprovado,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (
        !(
          id_caixa &&
          tipo_ajuste &&
          (saida || entrada) &&
          valor &&
          obs &&
          aprovado !== undefined
        )
      ) {
        throw new Error(
          "Todos os campos são obrigatórios!"
        );
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
        throw new Error(
          "O caixa selecionado já foi baixado"
        );
      }

      const [rowsAjustesAnteriores] =
        await conn.execute(
          `
        SELECT * FROM datasys_caixas_ajustes
        WHERE id = ?;
      `,
          [id]
        );
      const ajusteAnterior =
        rowsAjustesAnteriores &&
        rowsAjustesAnteriores[0];
      const ajustadoAntes =
        ajusteAnterior.aprovado;

      await conn.execute(
        `
        UPDATE datasys_caixas_ajustes
          SET tipo_ajuste = ?, saida = ?, entrada = ?, valor = ?, obs = ?, aprovado = ?
        WHERE id = ?;`,
        [
          tipo_ajuste,
          saida || null,
          entrada || null,
          valor,
          obs,
          ajustadoAntes &&
          !(
            checkUserDepartment(
              req,
              "FINANCEIRO",
              true
            ) ||
            checkUserPermission(req, "MASTER")
          )
            ? false
            : aprovado,
          id,
        ]
      );

      if (!ajustadoAntes && aprovado) {
        await aplicarAjuste({
          conn,
          id_ajuste: id,
          req,
        });
      }
      if (ajustadoAntes && aprovado) {
        await desfazerAjuste({
          conn,
          id_ajuste: id,
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "UPDATE_AJUSTE",
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
