const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../../helpers/checkUserPermission");

module.exports = function getPendencias(req) {
    return new Promise(async (resolve, reject) => {
      const { user } = req;
  
      const conn = await db.getConnection();
      try {
        if (
          checkUserDepartment(req, "FINANCEIRO") ||
          checkUserPermission(req, "MASTER")
        ) {
          resolve(0);
          return;
        }
  
        const [rowQtdeTotal] = await conn.execute(
          `SELECT COUNT(*) AS qtde
          FROM (
            SELECT
              t.id 
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
  
            WHERE t.id_tipo_solicitacao = 2
            AND NOT t.id_status = 2 
            AND NOT t.id_status = 0 
            AND t.data_emissao < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
            AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")
            AND t.id_solicitante = '${user.id}'
          ) AS subconsulta
          `
        );
        //^ Retirado do WHERE
        // t.id_status = 4 OR t.id_status = 5
        //       OR
        const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;
        resolve(totalVencimentos);
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "GET_PENDENCIAS_NOTAS_FISCAIS_TITULOS",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        reject(error);
      } finally {
        conn.release();
      }
    });
  }