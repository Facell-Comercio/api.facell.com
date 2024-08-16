const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");

module.exports = async ({ conn, data_caixa, id_filial }) => {
  return new Promise(async (resolve, reject) => {
    try {
      const [rowCaixas] = await conn.execute(
        `
        SELECT 
          dc.*
        FROM datasys_caixas dc
        WHERE id_filial = ?
        AND data < ?
        ORDER BY data DESC
        LIMIT 1
        `,
        [id_filial, startOfDay(data_caixa)]
      );
      const caixa = rowCaixas && rowCaixas[0];
      resolve(caixa);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_CAIXA_ANTERIOR",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};