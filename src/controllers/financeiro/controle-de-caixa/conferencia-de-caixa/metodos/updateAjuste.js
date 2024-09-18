const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const desfazerAjuste = require("./desfazerAjuste");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../../../helpers/checkUserPermission");
const aprovarAjuste = require("./aprovarAjuste");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, id_caixa, tipo_ajuste, saida, entrada, valor, obs, aprovado } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (
        !(id_caixa && tipo_ajuste && (saida || entrada) && valor && obs && aprovado !== undefined)
      ) {
        throw new Error("Todos os campos são obrigatórios!");
      }
      if (entrada === saida) {
        throw new Error("Entrada e saída não podem ser iguais!");
      }

      await conn.beginTransaction();

      //* Pega o caixa para validar se já foi baixado ou não
      const [rowsCaixas] = await conn.execute(
        `
        SELECT id, status FROM datasys_caixas
        WHERE id = ?
        AND (status = 'CONFIRMADO' OR status = 'CONFIRMADO')
      `,
        [id_caixa]
      );
      if (rowsCaixas && rowsCaixas.length > 0) {
        throw new Error("O caixa selecionado já foi baixado");
      }

      //* Verifica se o ajuste atual já foi aprovado ou não
      const [rowsAjustesAnteriores] = await conn.execute(
        "SELECT * FROM datasys_caixas_ajustes WHERE id = ?;",
        [id]
      );
      const ajustadoAntes =
        rowsAjustesAnteriores && rowsAjustesAnteriores[0] && rowsAjustesAnteriores[0].aprovado;

      //* Verifica se o usuário é um gestor do financeiro ou master
      const gestorOuMaster =
        checkUserDepartment(req, "FINANCEIRO", true) || checkUserPermission(req, "MASTER");

      if (ajustadoAntes) {
        await desfazerAjuste({
          conn,
          id_ajuste: id,
        });
      }

      await conn.execute(
        `
        UPDATE datasys_caixas_ajustes
          SET tipo_ajuste = ?, saida = ?, entrada = ?, valor = ?, obs = ?, aprovado = ?
        WHERE id = ?;`,
        [tipo_ajuste, saida || null, entrada || null, valor, obs, false, id]
      );

      //* Se o usúario é gestor ou master, ou se é uma transferência aprova o ajuste
      if (gestorOuMaster || tipo_ajuste === "transferencia") {
        await aprovarAjuste({
          body: {
            conn,
            id_ajuste: id,
            req_externo: req,
          },
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
