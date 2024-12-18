const cron = require("node-cron");
const { subDays } = require("date-fns");
const { logger } = require("../../../logger");
const {
  importComprasDatasys,
  importCampanhaEvolux,
} = require("../../controllers/marketing/mailing/mailing-controller");

// Importa as compras do dia anterior
cron.schedule("0 7 * * *", async () => {
  try {
    const target = subDays(new Date(), 1).toISOString();
    await importComprasDatasys({ body: { range_datas: { from: target, to: target } } });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "IMPORT_COMPRAS_DATASYS_CRON",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
  }
});

// Importa as campanhas do dia anterior
cron.schedule("0 7 * * *", async () => {
  try {
    const target = subDays(new Date(), 1).toISOString();
    await importCampanhaEvolux({ body: { range_datas: { from: target, to: target } } });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "IMPORT_CAMPANHAS_EVOLUX_CRON",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
  }
});
