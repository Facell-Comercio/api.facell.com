const { db } = require("../../../../mysql")


async function findNFfromParams(req) {
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
            reject(error)
        }
        finally{
            conn.release()
        }

    })
}



module.exports = {
    findNFfromParams
}