
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
        const { pageIndex, pageSize } = pagination || { pageIndex: 0, pageSize: 5 }
        const { termo } = filters || { termo: null }

        var where = ` WHERE 1=1 `
        const params = []

        if (termo) {
            where += ` AND u.nome LIKE CONCAT('%', ?, '%')`
            params.push(termo)
        }

        const offset = pageIndex * pageSize

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT 
            COUNT(u.id) as qtde 
            FROM users u
             ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;
            
            params.push(pageSize)
            params.push(offset)
            var query = `
            SELECT u.*, '*****' as senha FROM users u
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