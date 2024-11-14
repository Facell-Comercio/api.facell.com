const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

function getAll(req) {
    return new Promise(async (resolve,reject)=>{
        const {user} = req;
        if (!user) {
            reject("Usuário não autenticado!");
            return false;
        }
        //FILTROS
        const {filters, pagination} = req.query;
        const {modelo} = filters || {};
        const {pageIndex, pageSize} = pagination || {
            pageIndex: 0,
            pageSize: 15,
        };
        const params = [];
        
        let where = ` WHERE 1=1 `;
        if(modelo) {
            where += ` AND fm.modelo LIKE CONCAT('%', ?, '%") `;
            params.push(modelo);
        }

        let conn;
        try {
            conn = await db.getConnection();
            const [rowTotal] = await conn.execute(
                `SELECT count(fm.id) as qtde FROM fardamentos_modelos fm
                ${where}
                `,
                params
            );

            const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

            const offset = pageIndex * pageSize;
            params.push(pageSize);
            params.push(offset);

            let query = `
                SELECT * FROM fardamentos_modelos fm
                ${where}
                LIMIT ? OFFSET ?
            `;
            const [rows] = await conn.execute(query,params);
            const obtResponse = {
                rows: rows,
                pageCount: Math.ceil(qtdeTotal/pageSize),
                rowCount: qtdeTotal,
            };

            resolve(obtResponse);
        } catch(error) {
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "MODELOS",
                method: "GET_ALL",
                data: {message: error.message, stack: error.stack, name: error.name},
            });
            reject(error);
        } finally {
            if (conn) conn.release();
        }
    });
}

function insertOne(req) {
    return new Promise(async (resolve,reject)=>{
        const {id, modelo} = req.body;
        let conn;
        try{
            conn = await db.getConnection();
            if (id) {
                throw new Error(
                 "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"   
                );
            }
            if (!modelo) {
                throw new Error("é necessário informar o modelo!")
            }
            await conn.beginTransaction();
            await conn.execute(
                `INSERT INTO fardamentos_modelos (modelo) VALUES (?)`,
                [modelo]
            );
        } catch(error){
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "MODELOS",
                method: "INSERT_ONE",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            if (conn) await conn.rollback();
            reject(error);
        } finally {
            conn.release();
        }
    });
}

function update(req) {
    return new Promise(async(resolve,reject)=>{
        const {id, modelo} = req.body;
        let conn;
        try{
            conn = await db.getConnection();
            if (!id) {
                throw new Error ("ID não informado!");
            }
            if (!modelo) {
                throw new Error ("É necessário informar o modelo!");
            }
            await conn.beginTransaction();
            await conn.execute(
                `
                UPDATE fardamentos_modelos SET
                    modelo = ?
                WHERE id = ?`,
                [modelo, id]
            );
            await conn.commit();
            resolve({message: "Sucesso!"});
            return;
        } catch(error) {
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "MODELOS",
                method: "UPDATE",
                data: {message: error.message, stack: error.stack, name: error.name},
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
