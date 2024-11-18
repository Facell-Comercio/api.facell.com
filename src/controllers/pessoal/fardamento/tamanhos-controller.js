const {logger} = require("../../../../logger");
const {db} = require("../../../../mysql");

function getAll(req) {
    return new Promise(async(resolve,reject)=>{
        const {user} = req;
        if (!user) {
            reject ("Usuário não autenticado!");
            return false;
        }

        const {filters, pagination} = req.query;
        const {tamanho} = filters || {};
        const {pageIndex, pageSize}  = pagination || {
            pageIndex: 0,
            pageSize: 15,
        };
        const params = [];

        let where = `  WHERE 1=1 `;
        if (tamanho) {
            where += ` AND ft.tamanho LIKE '?' `;
        }

        let conn;
        try{
            conn = await db.getConnection();
            const [rowTotal] = await conn.execute(
                `SELECT count)(ft.id) as qtde FROM faradmentos_tamanhos ft
                ${where}
                `,
                params
            );

            const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

            const offset = pageIndex * pageSize;
            params.push(pageSize);
            params.push(offset);

            let query = `
                SELECT * FROM fardamentos_tamanhos ft
                ${where}
                LIMIT ? OFFSET ?
            `;
            const [rows] = await conn.execute(query, params);
            const obtResponse = {
                rows: rows,
                pageCount: Math.ceil(qtdeTotal/pageSize),
                rowCount: qtdeTotal,
            };

            resolve(obtResponse);

        } catch (error) {
            logger.error({
                module: "PESSOAL/FARADMENTOS",
                origin: "TAMANHOS",
                method: "GET_ALL",
                data: {message: error.message, stack: error.stack, name: error.name},
            });
            reject(error);
        } finally {
            if (conn) conn.release();
        }
    })
}

function insertOne(req) {
    return new Promise(async(resolve,reject)=>{
        const {id, tamanho} = req.body;
        let conn;
        try{
            conn = await db.getConnection();
            if (id) {
                throw new Error(
                    "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"   
                );
            }
            if(!tamanho) {
                throw new Error ("É necessário informar o tamanho !");
            }


            await conn.beginTransaction();

            await conn.execute(
                `INSERT INTO fardamentos_tamanhos (tamanho) VALUES (?)`,
                [tamanho]
            );
            await conn.commit();
            resolve({ message: "Sucesso" });
        } catch(error){
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "TAMANHOS",
                method: "INSERT_ONE",
                data: { message: error.message, stack: error.stack, name: error.name }
            });
            if (conn) conn.rollback();
            reject(error);
        } finally {
            conn.release();
        }
    });
}

function update(req) {
    return new Promise(async(resolve,reject)=>{
        const {id, tamanho} = req.body;
        let conn;
        try {
            conn = await db.getConnection();
            if (!id) {
                throw new Error ("ID não informado!");
            }
            if (!tamanho) {
                throw new Error ("Tamanho não informado!");
            }

            await conn.beginTransaction();

            await conn.execute(
                `
                UPDATE fardamentos_tamanhos SET 
                  tamanho = ? 
                WHERE id = ?`,
                [tamanho,id]
            );
            await conn.commit();
            resolve({message: "Sucesso!"})
            return;
        }catch(error){
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "TAMANHOS",
                method: "UPDTAE",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            if (conn) await conn.rollback();
            reject(error);
            return;
        } finally {
            conn.release();
        }
    });
}

module.exports = {
    getAll,
    insertOne,
    update,
};