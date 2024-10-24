const { logger } = require('../../../../../../logger');
const { db } = require('../../../../../../mysql');
const importarCaixas = require('./import');

module.exports = (req)=>{
    return new Promise(async(resolve, reject)=>{
        let conn;
        try {
            conn = await db.getConnection();
            const { body } = req;
            const { range_datas } = body || {}

            const [filiais] = await conn.execute(`SELECT id FROM filiais WHERE active = 1 and tim_cod_sap IS NOT NULL`);
            for(const filial of filiais){
                await importarCaixas({body: { id_filial: filial.id, range_datas}})
            }
            resolve(true)
        } catch (error) {
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERÊNCIA_DE_CAIXA', method: 'IMPORT_CAIXAS_POR_PERIODO',
                data: { message: error.message, stack: error.stack, name: error.name }
              })
        } finally{
            if(conn)conn.release();
        }
    })
}

