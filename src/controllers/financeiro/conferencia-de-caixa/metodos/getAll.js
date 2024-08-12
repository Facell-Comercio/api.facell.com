const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters } = req.query;
    const { filiais_list, id_filial } = filters || {};
    const params = [];
    let where = ` WHERE 1=1 `;
    if (id_filial) {
      where += ` AND dc.id_filial = ? `;
      params.push(id_filial);
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [filiais] = await conn.execute(
        `
        SELECT 
          dc.*,
          f.nome as filial
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        ${where}
        `,
        params
      );

      resolve(filiais);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA DE CAIXA",
        method: "GET_FILIAIS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
