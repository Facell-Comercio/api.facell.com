const { logger } = require('../../logger')

require('./processos/files')
require('./processos/datasys')

function iniciarJobs(){
    logger.info({
        module: 'ROOT', origin: 'CRON_JOBS', method: 'INIT',
        data: { message: 'JOBS Inicializados' }
      })
}

iniciarJobs()