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
        const { termo } = filters || {}
        const { pageIndex, pageSize } = pagination || { pageIndex: 1, pageSize: 15 }
        const params = []

        var where = ` WHERE 1=1 `
        if (termo) {
            params.push(termo)
            params.push(termo)
            params.push(termo)

            where += ` AND (
                ff.nome LIKE CONCAT('%', ?, '%')  OR
                ff.razao LIKE CONCAT('%', ?, '%')  OR
                ff.cnpj LIKE CONCAT('%', ?, '%')
            )`
        }

        const offset = pageIndex * pageSize
        params.push(pageSize)
        params.push(offset)
        console.log(pageSize, offset)
        try {
            const [rowTotal] = await db.execute(`SELECT count(ff.id) as qtde FROM fin_fornecedores ff
            WHERE 
                ff.nome LIKE CONCAT('%', ?, '%')  OR
                ff.razao LIKE CONCAT('%', ?, '%')  OR
                ff.cnpj LIKE CONCAT('%', ?, '%')
            `, [termo, termo, termo])
            const qtdeTotal = rowTotal && rowTotal[0] && rowTotal[0]['qtde'] || 0

            var query = `
            SELECT ff.id, ff.nome, ff.cnpj, ff.razao FROM fin_fornecedores ff
            ${where}
            
            LIMIT ? OFFSET ?
            `;
            console.log(query)

            console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched Titulos', titulos.length)
            const objResponse = {rows: rows, pageCount: Math.ceil(qtdeTotal / pageSize), rowCount: qtdeTotal}
            console.log(objResponse)

            resolve(objResponse)
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

function insertOne(req){
    return new Promise(async(resolve, reject)=>{
        const {id, ...rest} = req.body
        try {
            if(id){
                throw new Error('Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!')
            }
            const campos = ''
            const values = ''
            const params = []

            Object.keys(rest).forEach((key, index) => {
                if (index > 0) {
                    campos += ', ' // Adicionar vírgula entre os campos
                    values += ', ' // Adicionar vírgula entre os values
                }
                campos += `${key}`
                campos += `?`
                params.push(rest[key]) // Adicionar valor do campo ao array de parâmetros
            })

            const query = `INSERT INTO fin_fornecedores (${campos}) VALUES (${values});`;

            await db.execute(query, params)
            resolve({message: 'Sucesso'})
        } catch (error) {
            reject(error)
            
        }
    })
}

function update(req) {
    return new Promise(async (resolve, reject) => {
        const { id, ...rest } = req.body
        try {

            if (!id) {
                throw new Error('ID não informado!')
            }
            const params = []
            let updateQuery = 'UPDATE fin_fornecedores SET '

            // Construir a parte da query para atualização dinâmica
            Object.keys(rest).forEach((key, index) => {
                if (index > 0) {
                    updateQuery += ', ' // Adicionar vírgula entre os campos
                }
                updateQuery += `${key} = ?`
                params.push(rest[key]) // Adicionar valor do campo ao array de parâmetros
            })

            params.push(id)

            await db.execute(
                updateQuery +
                `WHERE id = ?
            `, params)

            resolve({ message: 'Sucesso!' })
            return
        } catch (error) {
            reject(error)
            return
        }
    })
}

function toggleActive(req){
    return new Promise(async (resolve, reject)=>{
        const {id} = req.query
        try {
            if(!id){
                throw new Error('ID não informado!')
            }
            await db.execute(`UPDATE fin_fornecedores SET active = NOT active WHERE id = ?`, [id])
            resolve({message: 'Sucesso!'})
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    getAll,
    getOne,
    insertOne,
    update,
    toggleActive,
}