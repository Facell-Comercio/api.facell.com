const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getOneAbatimentos(req) {
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
      const [rowsAbatimentos] = await conn.execute(
        `
              SELECT 
                va.*,
                u.nome as criador,
                v.saldo as saldo_vale
              FROM vales_abatimentos va
              LEFT JOIN users u ON u.id = va.id_user
              LEFT JOIN vales v ON v.id = va.id_vale
              WHERE va.id = ?
              `,
        [id]
      );
      const abatimento = rowsAbatimentos && rowsAbatimentos[0];

      const objResponse = {
        ...abatimento,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "GET_ONE_ABATIMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
