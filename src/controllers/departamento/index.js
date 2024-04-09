
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
        const { termo } = filters || { termo: null }

        var where = ` WHERE 1=1 `
        const params = []

        if (termo) {
            where += ` AND d.nome LIKE CONCAT('%', ?, '%')`
            params.push(termo)
        }

        const offset = pageIndex * pageSize

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT 
            COUNT(d.id) as qtde 
            FROM departamentos d
             ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;
            
            params.push(pageSize)
            params.push(offset)
            var query = `
            SELECT d.* FROM departamentos d
            ${where}
            ORDER BY d.id DESC
            LIMIT ? OFFSET ?
            `;
            // console.log(query)
            // console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched departamentos', departamentos.length)
            const objResponse = {rows: rows, pageCount: Math.ceil(qtdeTotal / pageSize), rowCount: qtdeTotal}
            // console.log(objResponse)
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
            FROM departamentos
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
        const { 
            id, nome, active
        } = req.body;

        const conn = await db.getConnection();
        try {
            if (!id) {
                throw new Error('ID do usuário não enviado!')
            }
            if (!nome) {
                throw new Error('Nome não enviado!')
            }
            await conn.beginTransaction();

            // Atualização de dados do usuário
            await conn.execute('UPDATE departamentos SET nome = ?, active = ? WHERE id = ?', [nome, active, id])

            await conn.commit()

            resolve({message: 'Sucesso!'})
        } catch (error) {
            await conn.rollback()
            console.log('ERRO_DEPARTAMENTO_UPDATE', error)
            reject(error)
        }
    })
}

function insertOne(req) {
    return new Promise(async (resolve, reject) => {
      const { id, nome } = req.body;
      try {
        if (id) {
          throw new Error(
            "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
          );
        }
        let campos = "nome";
        let values = "";
        let params = [nome];
        
        const query = `INSERT INTO departamentos (${campos}) VALUES (?);`;
  
        await db.execute(query, params);
        resolve({ message: "Sucesso" });
      } catch (error) {
        console.log(error);
        reject(error);
      }
    });
  }
  



module.exports = {
    getAll,
    getOne,
    update,
    insertOne,
}