const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { ensureArray } = require("../../../helpers/formaters");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      const { filters } = req.query || {};

      const { tipo_list } = filters || {};
      let where = " WHERE 1=1 ";

      if (tipo_list && ensureArray(tipo_list).length) {
        where += ` AND tipo IN (${ensureArray(tipo_list)
          .map((value) => db.escape(value))
          .join(",")})`;
      }
      conn = await db.getConnection();
      const [rowsCargos] = await conn.execute(`SELECT * FROM comissao_cargos ${where}`);

      resolve(rowsCargos);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_CARGOS",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
