const { db } = require('../../../mysql');

function getAll(req) {
    return new Promise(async (resolve, reject) => {
        const { user } = req
        // user.perfil = 'Financeiro'
        if (!user) {
            reject('Usuário não autenticado!')
            return false
        }
        // Filtros
        const { filters, pagination } = req.query
        const { pageIndex, pageSize } = pagination || { pageIndex: 0, pageSize: 15 }
        const { codigo, nivel, descricao, tipo, id_grupo_economico, descricao_pai, ativo} = filters || {}
        // const { id_filial, termo } = filters || {id_filial: 1, termo: null}

        var where = ` WHERE 1=1 `
        const params = []

        if(codigo){
            where += ` AND p.codigo LIKE CONCAT('?','%') `
            params.push(codigo)
        }
        if(descricao){
            where += ` AND p.descricao LIKE CONCAT('?','%') `
            params.push(descricao)
        }
        if(tipo){
            where += ` AND p.tipo = ? `
            params.push(tipo)
        }
        if(id_grupo_economico){
            where += ` AND p.id_grupo_economico = ? `
            params.push(id_grupo_economico)
        }
        if(descricao_pai){
            where += ` AND p.descricao_pai LIKE CONCAT('?','%') `
            params.push(descricao_pai)
        }
        if(ativo){
            where += ` AND p.ativo = ? `
            params.push(ativo)
        }

        const offset = (pageIndex) * pageSize

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT 
            COUNT(p.id) as qtde 
            FROM fin_plano_contas p
            INNER JOIN filiais f ON f.id_grupo_economico = p.id_grupo_economico
             ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;
            
            params.push(pageSize)
            params.push(offset)
            var query = `
            SELECT p.*, gp.nome as grupo_economico FROM fin_plano_contas p
            INNER JOIN filiais f ON f.id_grupo_economico = p.id_grupo_economico
            LEFT JOIN 
            grupos_economicos gp ON gp.id = p.id_grupo_economico 
            ${where}
            
            LIMIT ? OFFSET ?
            `;
            // console.log(query)

            console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched Titulos', titulos.size)
            // console.log(objResponse)
            resolve({rows, qtdeTotal})
            console.log(rows)
        } catch (error) {
            console.log(error);
            reject(error)
        }
    })
}

function getOne(req) {
    return new Promise(async (resolve, reject) => {
        const { id } = req.params
        try {
            const [rowPlanoContas] = await db.execute(`
            SELECT p.*, gp.nome as grupo_economico FROM fin_plano_contas p
            INNER JOIN filiais f ON f.id_grupo_economico = p.id_grupo_economico
            LEFT JOIN 
            grupos_economicos gp ON gp.id = p.id_grupo_economico 
            WHERE p.id = ?
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