const cron = require("node-cron");
const { subDays } = require("date-fns");
const { logger } = require("../../../logger");
const importComprasDatasys = require("../../controllers/marketing/mailing/metodos/importComprasDatasys");

// Importa as compras do dia anterior
cron.schedule("0 7 * * *", async () => {
  try {
    const target = subDays(new Date(), 1);
    await importComprasDatasys({ body: { range_datas: { from: target, to: target } } });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "IMPORT_COMPRAS_DATASYS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
  }
});
