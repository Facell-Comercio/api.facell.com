const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { checkUserFilial } = require("../../../helpers/checkUserFilial");
const { hasPermission } = require("../../../helpers/hasPermission");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const params = [];
    let where = "WHERE 1 = 1 ";
    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.id_filial);
    if (!hasPermission(req, ["MASTER", "METAS:METAS_VER_TODAS"]) && user.cpf) {
      if (filiaisGestor.length > 0) {
        where += ` AND (fm.id_filial IN ('${filiaisGestor.join("','")}') OR fm.cpf = ?)`;
        params.push(user.cpf);
      } else {
        where += ` AND fm.cpf = ? `;
        params.push(user.cpf);
      }
    }
    if (id) {
      where += ` AND fm.id = ? `;
      params.push(id);
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsMetas] = await conn.execute(
        `
              SELECT 
                fm.*,
                (fm.proporcional * 100) as proporcional,
                f.nome as filial,
                gp.id as id_grupo_economico, gp.nome as grupo_econômico
              FROM metas fm
              LEFT JOIN filiais f ON f.id = fm.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              ${where}
              `,
        params
      );
      const meta = rowsMetas && rowsMetas[0];
      if (!meta) {
        throw new Error(`A meta de id ${id} não foi encontrada`);
      }

      resolve({
        ...meta,
        canEdit:
          hasPermission(req, ["MASTER", "METAS:METAS_EDITAR"]) ||
          checkUserFilial(req, meta.id_filial, true),
      });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
