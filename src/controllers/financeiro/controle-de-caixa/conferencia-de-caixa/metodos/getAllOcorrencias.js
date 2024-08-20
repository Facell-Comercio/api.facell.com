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

    const params = [];

    const { id_filial, data_caixa, nao_resolvidas } = filters || {};
    let where = " WHERE 1=1 ";
    let conn;
    try {
      if (!id_filial) {
        throw new Error("É necessário informar o filial!");
      } else {
        where += " AND dco.id_filial =? ";
        params.push(id_filial);
      }
      if (data_caixa) {
        where += " AND dco.data_caixa = ? ";
        params.push(startOfDay(data_caixa));
      }
      if (parseInt(nao_resolvidas)) {
        where += " AND NOT dco.resolvida ";
      }

      conn = await db.getConnection();
      const [ocorrencias] = await conn.execute(
        `
        SELECT 
          dco.*,
          u.nome as user_criador
        FROM datasys_caixas_ocorrencias dco
        LEFT JOIN users u ON u.id = id_user_criador
        ${where}
        `,
        params
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
