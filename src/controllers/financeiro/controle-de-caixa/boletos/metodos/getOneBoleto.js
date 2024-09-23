const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    let conn;
    try {
      conn = await db.getConnection();
      const [rowsBoletos] = await conn.execute(
        `SELECT 
          dcb.*, f.nome as filial, f.id_grupo_economico,
          CASE WHEN dcb.status = "emitido" AND dcb.data_vencimento < CURDATE() THEN "atrasado" ELSE dcb.status END as status
        FROM datasys_caixas_boletos dcb
        LEFT JOIN filiais f ON f.id = dcb.id_filial
        WHERE dcb.id = ?
        `,
        [id]
      );
      const boleto = rowsBoletos && rowsBoletos[0];

      const [caixas] = await conn.execute(
        `
        SELECT dc.data as data_caixa, dcbc.valor
        FROM datasys_caixas_boletos_caixas dcbc
        LEFT JOIN datasys_caixas dc ON dc.id = dcbc.id_caixa
        WHERE dcbc.id_boleto = ?
        ORDER BY dc.data ASC
        `,
        [id]
      );

      const objResponse = {
        ...boleto,
        caixas,
      };

      resolve(objResponse);
    } catch (error) {
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_ONE_BOLETO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn) conn.release();
    }
  });
};
