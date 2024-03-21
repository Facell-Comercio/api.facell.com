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
        const { pageIndex, pageLength } = pagination || { pageIndex: 1, pageLength: 15 }
        const { id_filial, termo } = filters || {}

        var where = ` WHERE 1=1 `
        const params = []

        if (id_filial) {
            where += ` AND f.id = ?`
            params.push(id_filial)
        }
        if (termo) {
            where += ` AND (
                p.codigo LIKE CONCAT('%', ?, '%')
                OR p.descricao LIKE CONCAT('%', ?, '%')
            )`
            params.push(termo)
            params.push(termo)
        }

        const offset = (pageIndex - 1) * pageLength

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT COUNT(id) as qtde FROM fin_plano_contas ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;
            
            params.push(pageLength)
            params.push(offset)
            var query = `
            SELECT p.* FROM fin_plano_contas p
            JOIN filiais f ON f.id_grupo_economico = p.id_grupo_economico
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

function getOne(req) {
    return new Promise(async (resolve, reject) => {
        const { id } = req.params
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