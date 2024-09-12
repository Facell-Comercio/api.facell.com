const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");
const aplicarAjuste = require("./aplicarAjuste");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../../../helpers/checkUserPermission");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, id_caixa, valor, entrada, saida, obs, tipo_ajuste } = req.body;

    const user = req.user;
    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!(id_caixa && valor && (entrada || saida) && obs && tipo_ajuste)) {
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
        throw new Error("O caixa selecionado já foi baixado");
      }

      const aprovado =
        tipo_ajuste === "transferencia" ||
        (tipo_ajuste !== "transferencia" &&
          (checkUserDepartment(req, "FINANCEIRO", true) || checkUserPermission(req, "MASTER")));

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_ajustes (
          id_caixa,
          id_user,
          tipo_ajuste,
          saida,
          entrada,
          valor,
          aprovado,
          obs
        ) VALUES (?,?,?,?,?,?,?,?);`,
        [id_caixa, user.id, tipo_ajuste, saida || null, entrada || null, valor, aprovado, obs]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o ajuste!");
      }

      if (aprovado) {
        await aplicarAjuste({
          conn,
          id_ajuste: newId,
          req,
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_AJUSTE",
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
