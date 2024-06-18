const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql")


async function findNFbyParams(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection();
        try {
            const { nf, cnpj_fornecedor } = req.query
            if(!nf){
                throw new Error('Nota fiscal não informada!')
            }
            if(!cnpj_fornecedor){
                throw new Error('CNPJ do fornecedor não informado!')
            }
            const notaFiscal = parseInt(nf)
            const cnpjFornecedor = parseInt(cnpj_fornecedor)

            const [result] = await conn.execute(`SELECT * FROM datasys_fiscal 
            WHERE 
            CAST(nf AS UNSIGNED) = ? 
            AND CAST(cnpj_fornecedor AS UNSIGNED) = ?
            LIMIT 1
            `, [notaFiscal, cnpjFornecedor])
            const nota = result && result[0] || null
            resolve(nota)
        } catch (error) {
            logger.error({
                module: 'DATASYS', origin: 'FISCAL', method: 'FIND_BY_PARAMS', 
                data: {message: error.message, stack: error.stack, name: error.name }
            })
            reject(error)
        }
        finally{
            conn.release()
        }

    })
}



module.exports = {
    findNFbyParams
}