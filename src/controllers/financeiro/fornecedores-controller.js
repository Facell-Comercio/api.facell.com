const {db} = require('../../../mysql');

function getAll(req){
    return new Promise(async(resolve, reject)=>{
        const {user} = req
        // user.perfil = 'Financeiro'
        if(!user){
            reject('Usuário não autenticado!')
            return false
        }
        // Filtros
        const { filters, pagination } = req.query
        const {termo} = filters || {}
        const {pageIndex, pageLength} = pagination || {pageIndex: 1, pageLength: 15}
        const params = []

        var where = ` WHERE 1=1 `
        if(termo){
            params.push(termo)
            params.push(termo)
            params.push(termo)

            where += ` AND (
                ff.nome LIKE CONCAT('%', ?, '%')  OR
                ff.razao LIKE CONCAT('%', ?, '%')  OR
                ff.cnpj LIKE CONCAT('%', ?, '%')
            )`
        }

        const offset = (pageIndex - 1) * pageLength
        params.push(pageLength)
        params.push(offset)
        try {
            const [rowTotal] = await db.execute(`SELECT count(ff.id) as qtde FROM fin_fornecedores ff
            WHERE 
                ff.nome LIKE CONCAT('%', ?, '%')  OR
                ff.razao LIKE CONCAT('%', ?, '%')  OR
                ff.cnpj LIKE CONCAT('%', ?, '%')
            `, [termo, termo, termo])
            const qtdeTotal = rowTotal && rowTotal[0] && rowTotal[0]['qtde'] || 0

            var query = `
            SELECT ff.* FROM fin_fornecedores ff
            ${where}
            
            LIMIT ? OFFSET ?
            `;
            // console.log(query)
            
            // console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched Titulos', titulos.length)
            // console.log(objResponse)
            resolve({rows, qtdeTotal})
        } catch (error) {
            reject(error)
        }
    })
}

function getOne(req){
    return new Promise(async(resolve, reject)=>{
        const {id} = req.params
        try {
            const [rowFornecedor] = await db.execute(`
            SELECT *
            FROM fin_fornecedores
            WHERE id = ?
            `, [id])
            const fornecedor = rowFornecedor && rowFornecedor[0]
            console.log(fornecedor)
            resolve(fornecedor)
            return
        } catch (error) {
            reject(error)
            return
        }
    })
}

module.exports = {
    getAll,
    getOne,
}