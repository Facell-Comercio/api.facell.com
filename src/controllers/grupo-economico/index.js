
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
        const { id_matriz } = filters || { id_matriz: null }

        var where = ` WHERE 1=1 `
        const params = []

        if (id_matriz) {
            where += ` AND g.id_matriz = ?`
            params.push(id_matriz)
        }

        const offset = pageIndex * pageSize

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT 
            COUNT(g.id) as qtde 
            FROM grupos_economicos g
             ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;
            
            params.push(pageSize)
            params.push(offset)
            var query = `
            SELECT g.*, f.nome as matriz FROM grupos_economicos g
            JOIN filiais f ON f.id = g.id_matriz
            ${where}
            
            LIMIT ? OFFSET ?
            `;
            console.log(query)

            console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched users', users.length)
            const objResponse = {rows: rows, pageCount: Math.ceil(qtdeTotal / pageSize), rowCount: qtdeTotal}
            console.log(objResponse)
            resolve(objResponse)
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
            FROM users
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

function update(req) {
    return new Promise(async (resolve, reject) => {
     
        try {
            
        } catch (error) {
           
        }
    })
}

function remove(req) {
    return new Promise(async (resolve, reject) => {
     
        try {
            
        } catch (error) {
           
        }
    })
}

function add(req) {
    return new Promise(async (resolve, reject) => {
     
        try {
            
        } catch (error) {
           
        }
    })
}

function toggleActive(req) {
    return new Promise(async (resolve, reject) => {
     
        try {
            
        } catch (error) {
           
        }
    })
}



module.exports = {
    getAll,
    getOne,
    update,
    remove,
    add,
    toggleActive,
}