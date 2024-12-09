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

    let where = ` WHERE f.tim_cod_sap IS NOT NULL and f.active = 1 `;
    if (filiais_list && filiais_list.length > 0) {
      where += ` AND dc.id_filial IN(${filiais_list.map((value) => db.escape(value)).join(",")}) `;
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [filiais] = await conn.execute(
        `
        SELECT 
          f.nome as filial,
          f.id as id_filial,
          SUM(CASE WHEN dc.status = 'A CONFERIR' THEN 1 ELSE 0 END) AS a_conferir,
          SUM(CASE WHEN dc.status = 'CONFERIDO' THEN 1 ELSE 0 END) AS baixa_pendente,
          SUM(CASE WHEN dc.divergente = TRUE THEN 1 ELSE 0 END) AS divergentes,
          (SELECT 
            COUNT(dco.id) FROM datasys_caixas_ocorrencias dco 
            WHERE dco.id_filial = dc.id_filial AND dco.data_caixa = dc.data) as ocorrencias

        FROM filiais f
        LEFT JOIN datasys_caixas dc ON dc.id_filial = f.id AND dc.status IN (A CONFERIR', 'CONFERIDO')
        ${where}
        
        GROUP BY f.id
        `
      );

      const [rowTotalAjustes] = await conn.execute(
        "SELECT COUNT(id) as total_ajustes FROM datasys_caixas_ajustes WHERE NOT aprovado"
      );
      const totalAjustes =
        rowTotalAjustes && rowTotalAjustes[0] && rowTotalAjustes[0].total_ajustes;

      resolve({ filiais, totalAjustes });
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
