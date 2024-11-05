const cron = require('node-cron');
const { importCaixasPorMatriz } = require('../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller');
const { subDays } = require('date-fns');
const { logger } = require('../../../logger');

// Importa os caixas da Facell
cron.schedule('0 5 * * *', async () => {
    try {
        const target = subDays(new Date(), 1);
        await importCaixasPorMatriz({ id_matriz: 1, range_datas: { from: target, to: target } })
    } catch (error) {
        logger.error({
            module: 'FINANCEIRO', origin: 'CONFERÊNCIA_DE_CAIXA', method: 'IMPORT_CAIXAS_POR_MATRIZ',
            data: { message: error.message, stack: error.stack, name: error.name }
        })
    }
})

// Importa os caixas da Fort
cron.schedule('30 5 * * *', async () => {
    try {
        const target = subDays(new Date(), 1);
        await importCaixasPorMatriz({ id_matriz: 25, range_datas: { from: target, to: target } })
    } catch (error) {
        logger.error({
            module: 'FINANCEIRO', origin: 'CONFERÊNCIA_DE_CAIXA', method: 'IMPORT_CAIXAS_POR_MATRIZ',
            data: { message: error.message, stack: error.stack, name: error.name }
        })
    }
})