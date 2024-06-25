const { logger } = require('../../logger')

require('./processos/clearTempFolder')

function iniciarJobs(){
    logger.info({
        module: 'ROOT', origin: 'CRON_JOBS', method: 'INIT',
        data: { message: 'JOBS Inicializados' }
      })
}

iniciarJobs()