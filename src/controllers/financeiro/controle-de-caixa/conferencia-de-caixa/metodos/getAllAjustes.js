const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters } = req.query;

    const { id_caixa, aprovado } = filters || {};
    let conn;
    try {
      conn = await db.getConnection();
      let where = " WHERE 1=1 ";
      const params = [];
      if (id_caixa) {
        where += ` AND dca.id_caixa =? `;
        params.push(id_caixa);
      }
      if (aprovado !== undefined) {
        if (Number.parseInt(aprovado)) {
          where += ` AND dca.aprovado `;
        } else {
          where += ` AND NOT dca.aprovado `;
        }
      }
      const [ajustes] = await conn.execute(
        `
        SELECT 
          dca.*,
          u.nome as user,
          dc.data as data_caixa,
          f.nome as filial
        FROM datasys_caixas_ajustes dca
        LEFT JOIN users u ON u.id = id_user
        LEFT JOIN datasys_caixas dc ON dc.id = dca.id_caixa
        LEFT JOIN filiais f ON f.id = dc.id_filial
        ${where}
        `,
        params
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
