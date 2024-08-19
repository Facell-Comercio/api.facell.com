const { formatDate } = require("date-fns");
const { logger } = require("../../../../../../logger");
const {db} = require("../../../../../../mysql");

module.exports = async (req)=>{
    return new Promise(async(resolve, reject)=>{
        let conn
        try {
            const { } = req.body;
            // ^ Validações
            
            
            conn = await db.getConnection()
            conn.config.namedPlaceholders = true

            const result = true

            await conn.commit()
            resolve(result)
        } catch (error) {
            await conn.rollback()
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERENCIA_DE_CAIXA', method: 'IMPORT_CREDIARIO',
                data: { message: error.message, stack: error.stack, name: error.name }
              })
        }finally{
            if(conn) conn.release()
        }
    })
}