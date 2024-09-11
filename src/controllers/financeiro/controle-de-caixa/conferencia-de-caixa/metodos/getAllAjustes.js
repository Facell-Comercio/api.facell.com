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
    const { filters } = req.query;

    const { id_caixa } = filters || {};
    let conn;
    try {
      conn = await db.getConnection();
      console.log(filters);

      const [ajustes] = await conn.execute(
        `
        SELECT 
          dca.*,
          u.nome as user_criador
        FROM datasys_caixas_ajustes dca
        LEFT JOIN users u ON u.id = id_user
        WHERE dca.id_caixa = ?
        `,
        [id_caixa]
      );

      resolve({
        ajustes,
        qtde_ajustes: ajustes && ajustes.length,
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ALL_AJUSTES",
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
