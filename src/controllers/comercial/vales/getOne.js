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
      const [rowsVales] = await conn.execute(
        `
              SELECT 
                v.*, 
                f.nome as filial,
                u.nome as criador
              FROM vales v
              LEFT JOIN filiais f ON f.id = v.id_filial
              LEFT JOIN users u ON u.id = v.id_criador
              WHERE v.id = ?
              `,
        [id]
      );
      const vale = rowsVales && rowsVales[0];
      if (!vale) {
        throw new Error(`Vale de id ${id} não encontrado`);
      }
      const [rowsAbatimentos] = await conn.execute(
        `
              SELECT 
                va.*, 
                u.nome as criador
              FROM vales_abatimentos va
              LEFT JOIN users u ON u.id = va.id_user
              WHERE va.id_vale = ?
              `,
        [id]
      );

      const objResponse = {
        ...vale,
        abatimentos: rowsAbatimentos,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
