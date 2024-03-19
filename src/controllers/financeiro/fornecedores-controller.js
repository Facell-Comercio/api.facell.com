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
        const { filters } = req.query
        const {termo} = filters || {}
        var params = undefined

        var where = ` WHERE 1=1 `
        if(termo){
            params = []
            params.push(termo)
            params.push(termo)
            params.push(termo)

            where += ` AND (
                ff.nome LIKE CONCAT(%, ?, %)  OR
                ff.razao LIKE CONCAT(%, ?, %)  OR
                ff.cnpj LIKE CONCAT(%, ?, %)
            )`
        }

        try {
            var query = `
            SELECT ff.* FROM fin_fornecedores ff
            ${where}
            
            `;
            // console.log(query)
            
            // console.log(params)
            const [rows] = await db.execute(query)

            // console.log('Fetched Titulos', titulos.length)
            // console.log(objResponse)
            resolve(rows)
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