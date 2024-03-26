const { db } = require('../../../mysql');

function getAll(req) {
    return new Promise(async (resolve, reject) => {
        const { user } = req
        // user.perfil = 'Financeiro'
        if (!user) {
            reject('Usuário não autenticado!')
            return false
        }

        try {
            var query = `SELECT ffp.id, ffp.forma_pagamento FROM fin_formas_pagamento ffp`;
            // console.log(query)
            // console.log(params)
            const [rows] = await db.execute(query)
            resolve(rows)
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
            const [rowFormaPagamento] = await db.execute(`
            SELECT *
            FROM fin_formas_pagamento
            WHERE id = ?
            `, [id])
            const formaPagamento = rowFormaPagamento && rowFormaPagamento[0]
            console.log(formaPagamento)
            resolve(formaPagamento)
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

            const query = `INSERT INTO fin_formas_pagamento (${campos}) VALUES (${values});`;

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
            let updateQuery = 'UPDATE fin_formas_pagamento SET '

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
            await db.execute(`UPDATE fin_formas_pagamento SET active = NOT active WHERE id = ?`, [id])
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