const {
  logger,
} = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsAjustes] = await conn.execute(
        `
        SELECT 
          dca.*,
          u.nome as user
        FROM datasys_caixas_ajustes dca
        LEFT JOIN users u ON u.id = id_user
        WHERE dca.id = ?
        `,
        [id]
      );
      const ajuste =
        rowsAjustes && rowsAjustes[0];

      resolve(ajuste);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ONE_AJUSTE",
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
