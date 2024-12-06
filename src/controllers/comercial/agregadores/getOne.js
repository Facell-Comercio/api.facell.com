const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
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
    let where = " WHERE 1=1 ";
    if (!hasPermission(req, ["MASTER", "METAS:AGREGADORES_VER_TODOS"]) && user.cpf) {
      where += ` AND fa.cpf = ? `;
      params.push(user.cpf);
    }
    if (id) {
      where += ` AND fa.id = ? `;
      params.push(id);
    }
    let conn;
    try {
      conn = await db.getConnection();

      const [rowsAgregadores] = await conn.execute(
        `
              SELECT
                fa.*,
                (fa.proporcional * 100) as proporcional,
                f.nome as filial,
                gp.id as id_grupo_economico, gp.nome as grupo_econômico
              FROM metas_agregadores fa
              LEFT JOIN filiais f ON f.id = fa.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              ${where}
              `,
        params
      );
      const agregador = rowsAgregadores && rowsAgregadores[0];
      if (!agregador) {
        throw new Error(`O agregador de id ${id} não foi encontrado`);
      }
      const metas = agregador.metas_agregadas && agregador.metas_agregadas.split(";");

      const [rowsMetas] = await conn.execute(`
        SELECT 
        fm.*,
        f.nome as filial,
        gp.nome as grupo_economico
        FROM metas fm
        LEFT JOIN filiais f ON f.id = fm.id_filial
        LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
        WHERE ${metas ? `fm.cpf IN ('${metas.join("','")}')` : "1<>1"}
        `);

      resolve({ ...agregador, metas: rowsMetas });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
