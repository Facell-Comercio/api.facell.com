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
        const {id_filial} = filters || {}

        var where = ` WHERE 1=1 `
        const params = []

        if(id_filial){
            where += ` AND f.id = ?`
            params.push(id_filial)
        }
        
        try {

            var query = `
            SELECT p.* FROM fin_plano_contas p
            JOIN filiais f ON f.id_grupo_economico = p.id_grupo_economico
            ${where}
            
            `;
            // console.log(query)
            
            // console.log(params)
            const [rows] = await db.execute(query, params)

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
            const [rowPlanoContas] = await db.execute(`
            SELECT *
            FROM fin_plano_contas
            WHERE id = ?
            `, [id])
            const planoContas = rowPlanoContas && rowPlanoContas[0]
            resolve(planoContas)
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