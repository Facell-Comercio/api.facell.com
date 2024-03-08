const {db} = require('../../../../mysql');

function getTitulos(req){
    return new Promise(async(resolve, reject)=>{
        const {user} = req
        user.perfil = 'Financeiro'
        if(!user){
            reject('Usuário não autenticado!')
            return false
        }
        const {pageIndex, pageSize} = req.query;
        const offset = pageIndex > 0 ? pageSize * (pageIndex) : 0;
        // console.log(pageIndex, pageSize, offset)
        var filters = ``
        if(user.perfil !== 'Financeiro' && user.perfil !== 'Master'){
            filters = ` WHERE id_emissor = '${user.id}' `
        }
        try {
            const [rowsTitulos] = await db.execute(`SELECT count(t.id) as total FROM fin_cp_titulos t ${filters}`)
            const totalTitulos = rowsTitulos && rowsTitulos[0]['total'] || 0

            var query = `SELECT 
            t.id, s.status, t.created_at, t.data_vencimento, t.descricao, t.valor, forn.nome as fornecedor, u.nome as solicitante
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_emissor
            ${filters} ORDER BY created_at DESC LIMIT ? OFFSET ?`
            
            const [titulos] = await db.execute(query, [pageSize, offset])
            const objResponse = {rows: titulos, pageCount: Math.ceil(totalTitulos / pageSize), rowCount: totalTitulos}
            // console.log(objResponse)
            resolve(objResponse)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    getTitulos,
}