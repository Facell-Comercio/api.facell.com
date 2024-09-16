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
    const { filiais_list } = filters || {};

    let where = ` WHERE 1=1 `;
    if (filiais_list && filiais_list.length > 0) {
      where += ` AND dc.id_filial IN('${filiais_list.join("','")}') `;
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [filiais] = await conn.execute(
        `
        SELECT 
          dc.id_filial,
          SUM(dc.status = 'A CONFERIR') as a_conferir,
          SUM(dc.status = 'CONFERIDO') as baixa_pendente,
          SUM(dc.status = 'CONFIRMADO') as baixa_datasys_pendente,
          COUNT(dco.id) as ocorrencias,
          SUM(dc.divergente) as divergentes,
          f.nome as filial
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        LEFT JOIN datasys_caixas_ocorrencias dco ON dco.id_filial = dc.id_filial AND dco.data_caixa = dc.data
        ${where}
        
        GROUP BY dc.id_filial
        `
      );

      resolve(filiais);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_FILIAIS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
