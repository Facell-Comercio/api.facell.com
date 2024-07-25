const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { checkCodigoBarras } = require("../../../../helpers/chekers");
const { normalizeCodigoBarras } = require("../../../../helpers/mask");

module.exports = function updateFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { data_prevista, cod_barras, valor } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID da fatura não informado!");
      }
      if (!data_prevista) {
        throw new Error("Data de previsão de pagamento não informada!");
      }

      const codBarras = normalizeCodigoBarras(cod_barras) || null;
      if (!!codBarras && !checkCodigoBarras(codBarras)) {
        throw new Error(`Código de barras inválido: ${cod_barras}`);
      }
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET data_prevista = ?, cod_barras = ?, valor = ? WHERE id = ?`,
        [startOfDay(data_prevista), codBarras, valor, id]
      );

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "UPDATE_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
