const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
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
              FROM facell_metas fm
              LEFT JOIN filiais f ON f.id = fm.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              WHERE fm.id = ?
              `,
        [id]
      );
      const meta = rowsMetas && rowsMetas[0];
      if (!meta) {
        throw new Error(`A meta de id ${id} não foi encontrada`);
      }

      resolve(meta);
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
