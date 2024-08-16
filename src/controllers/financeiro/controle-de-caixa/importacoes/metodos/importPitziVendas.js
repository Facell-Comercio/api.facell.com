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

            
            await conn.commit()
            resolve(result)
        } catch (error) {
            await conn.rollback()
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CAIXAS', method: 'IMPORT_CIELO',
                data: { message: error.message, stack: error.stack, name: error.name }
              })
        }finally{
            if(conn) conn.release()
        }
    })
}