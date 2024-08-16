const { startOfDay } = require("date-fns");
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

    const { id_filial, data_caixa } = filters || {};

    let conn;
    try {
      if (!id_filial) {
        throw new Error("É necessário informar o filial!");
      }
      if (!data_caixa) {
        throw new Error("É necessário informar a data do caixa!");
      }

      conn = await db.getConnection();
      const [ocorrencias] = await conn.execute(
        `
        SELECT 
          dco.*,
          u.nome as user_criador
        FROM datasys_caixas_ocorrencias dco
        LEFT JOIN users u ON u.id = id_user_criador
        WHERE dco.id_filial = ? AND dco.data = ?
        `,
        [id_filial, startOfDay(data_caixa)]
      );

      resolve({
        ocorrencias,
        qtde_ocorrencias: ocorrencias && ocorrencias.length,
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ALL_OCORRENCIAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};