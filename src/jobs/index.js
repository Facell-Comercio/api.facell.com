const { logger } = require("../../logger");

require("./processos/files");
require("./processos/datasys");
require("./processos/marketing");

function iniciarJobs() {
  logger.info({
    module: "ROOT",
    origin: "CRON_JOBS",
    method: "INIT",
    data: { message: "JOBS Inicializados" },
  });
}

iniciarJobs();
