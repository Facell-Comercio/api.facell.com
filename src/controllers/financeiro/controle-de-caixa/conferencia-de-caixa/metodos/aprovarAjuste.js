const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const { checkUserDepartment } = require("../../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../../helpers/hasPermission");
const aplicarAjuste = require("./aplicarAjuste");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let { id_ajuste, conn, req_externo } = req.body;
    try {
      conn = conn || (await db.getConnection());

      //~ Se a ação realizada for apenas a de aprovar um ajuste inicia uma transação
      !id_ajuste && (await conn.beginTransaction());

      //^ Início da lógica de aprovação

      //* Verifica se o usuário é um gestor do financeiro ou master
      const gestorOuMaster =
        checkUserDepartment(req_externo || req, "FINANCEIRO", true) ||
        hasPermission(req_externo || req, "MASTER");

      //* Coleta os dados do ajuste
      const [rowsAjustes] = await conn.execute(
        "SELECT * FROM datasys_caixas_ajustes WHERE id = ?;",
        [id_ajuste]
      );
      const ajuste = rowsAjustes && rowsAjustes[0];

      //* Se o usúario é gestor ou master, ou se é uma transferência aprova o ajuste
      const aprovado = gestorOuMaster || ajuste.tipo_ajuste === "transferencia";

      //* Realiza o update do ajuste de aprovado
      await conn.execute("UPDATE datasys_caixas_ajustes SET aprovado = ? WHERE id = ?", [
        aprovado,
        id_ajuste,
      ]);

      //* Se o ajuste tiver sido aprovado aplica ele
      if (aprovado) {
        await aplicarAjuste({
          conn,
          id_ajuste,
          req: req_externo || req,
        });
      }

      //^ Fim da lógica de aprovação

      //~ Se a ação realizada for apenas a de aprovar um ajuste ele commita a transação
      !id_ajuste && (await conn.commit());
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "APROVAR_AJUSTE",
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
