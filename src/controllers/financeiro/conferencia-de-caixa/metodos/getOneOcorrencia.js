const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

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
      const [rowsOcorrencias] = await conn.execute(
        `
        SELECT 
          dco.*,
          u.nome as user_criador
        FROM datasys_caixas_ocorrencias dco
        LEFT JOIN users u ON u.id = id_user_criador
        WHERE dco.id = ?
        `,
        [id]
      );
      const ocorrencia = rowsOcorrencias && rowsOcorrencias[0];

      resolve(ocorrencia);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA DE CAIXA",
        method: "GET_ONE_OCORRENCIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
