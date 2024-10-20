const { logger } = require('../../../../../../logger');
const { db } = require('../../../../../../mysql');
const importarCaixas = require('./import');

module.exports = ({id_matriz, range_datas})=>{
    return new Promise(async(resolve, reject)=>{
        let conn;
        try {
            conn = await db.getConnection();

            const [filiais] = await conn.execute(`SELECT id FROM filiais WHERE id_matriz = ? and active = 1 AND tim_cod_sap IS NOT NULL`,[id_matriz]);
            for(const filial of filiais){
                await importarCaixas({body: { id_filial: filial.id, range_datas}})
            }
            resolve(true)
        } catch (error) {
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERÊNCIA_DE_CAIXA', method: 'IMPORT_CAIXAS_MATRIZ',
                data: { message: error.message, stack: error.stack, name: error.name }
              })
        } finally{
            if(conn)conn.release();
        }
    })
}

