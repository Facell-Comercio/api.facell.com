const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const cruzarRelatorios = require("./cruzarRelatorios");

module.exports = async () => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.id, dc.id_filial, dc.data as data_caixa,
          dc.valor_cartao, dc.valor_recarga, dc.valor_pix,
          dc.valor_pitzi, dc.valor_tradein, dc.valor_crediario
        FROM datasys_caixas dc
        WHERE dc.status = "A CONFERIR" OR dc.status = "CONFERIDO"
        `
      );

      for (const caixa of rowsCaixas) {
        try {
          await cruzarRelatorios({ conn, body: { id_filial: caixa.id_filial, data_caixa: caixa.data_caixa}})

        } catch (e) {
          logger.error({
            module: "FINANCEIRO",
            origin: "CONFERÊNCIA_DE_CAIXA",
            method: "CRUZAR_RELATORIOS_LOTE",
            data: {
              message: `Caixa de id:${caixa.id} - ${error.message}`,
              stack: error.stack,
              name: error.name,
            },
          });
          continue;
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "CRUZAR_RELATORIOS_LOTE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
