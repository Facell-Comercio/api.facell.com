const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { formatDate } = require('date-fns');


function getAll(req){
    return new Promise(async(resolve,reject) =>{
        let conn;
        try {
            // FILTROS
            const {filters, pagination} = req.query;
            const {tamanho, modelo, id_grupo_economico, uf, sexo} = filters || {};
            const {pageIndex, pageSize} = pagination || {
                pageIndex: 0,
                pageSize: 15,
            };
            const params = [];

            let where = ` WHERE 1=1 `;

            if (tamanho){
                where += ` AND ft.tamanho LIKE CONCAT ('%', ?, '%')`;
                params.push(tamanho);
            }

            if (modelo){
                where += ` AND fm.modelo LIKE CONCAT ('%', ?, '%')`;
                params.push(modelo);
            } 

            if (id_grupo_economico){
                where += ` AND fe.id_grupo_economico = ?`;
                params.push(id_grupo_economico);
            }

            if (uf) {
                where += ` AND fe.uf LIKE CONCAT(?,'%')`;
                params.push(uf);
            }

            if (sexo) {
                where += ` AND fe.sexo = ?`;
                params.push(sexo);
            }

            conn = await db.getConnection();
            const [rowTotal] = await conn.execute(
                `SELECT count(fe.id) as qtde FROM fardamentos_estoque fe 
                LEFT JOIN fardamentos_tamanhos ft ON ft.id = fe.id_tamanho 
                LEFT JOIN fardamentos_modelos fm ON fm.id = fe.id_modelo 
                ${where}`,
                params
            );

            const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;
            const offset = pageIndex * pageSize;
            params.push(pageSize);
            params.push(offset);

            let query = `
            SELECT 
                fe.*,fe.id,
                ge.nome as grupo_economico,
                fm.modelo,
                ft.tamanho
            FROM fardamentos_estoque fe 
            LEFT JOIN grupos_economicos ge ON ge.id = fe.id_grupo_economico
            LEFT JOIN fardamentos_modelos fm ON fm.id = fe.id_modelo
            LEFT JOIN fardamentos_tamanhos ft ON ft.id = fe.id_tamanho 
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
        } catch (error) {
            logger.error({
                module: "PESSOAL/FARDAMENTOS",
                origin: "ESTOQUE",
                method: "GET_ALL",
                data: {message: error.message, stack: error.stack, name: error.name},
            })
            reject(error);
        } finally{
            if (conn) conn.release();
        }
    })
}

const abastecerEstoque =async (req,res)=>{
    let conn;
    try {
        const { id_modelo, id_tamanho, id_grupo_economico, uf, sexo, qtde, dataInicial} = req.body || {};
        const { user } = req;
        
        let data = formatDate(dataInicial ? new Date(dataInicial) : new Date(), 'yyyy-MM-dd');
        
        let {preco, permite_concessao} = req.body || {};
        preco = parseFloat(preco) || 0;
        if (permite_concessao === "true" || permite_concessao === 1) { permite_concessao = 1} else if (permite_concessao === "false" || permite_concessao === 0) {permite_concessao = 0;} else { permite_concessao = 1 }

        // VALIDAÇÕES
        if(!id_modelo) throw new Error('ID Modelo não informado!');
        if(!id_tamanho) throw new Error('ID Tamanho não informado!');
        if(!id_grupo_economico) throw new Error('ID Grupo Economico não informado!');
        if(!uf) throw new Error('UF não informado!');
        if(!sexo) throw new Error('Sexo não informado!');
        if(!qtde) throw new Error('Quantidade não informado!');

        conn = await db.getConnection();

        // PROCURAR ESTOQUE
        const [rowsEstoque] = await conn.execute(`SELECT id FROM fardamentos_estoque 
            WHERE 
            id_modelo = ? AND id_tamanho = ? AND id_grupo_economico = ? AND uf = ? AND sexo = ? 
            `, [id_modelo, id_tamanho, id_grupo_economico, uf, sexo]);

        const estoque = rowsEstoque && rowsEstoque[0];
        if(estoque){
            // SE EXISTIR, ATUALIZAR SALDO
            // Atualizar o saldo
            await conn.execute(`
                UPDATE fardamentos_estoque 
                SET saldo = saldo + ? 
                WHERE id = ?`, 
                [qtde, estoque.id]);
        }else{
            // SE NÃO EXISTIR, CRIAR REGISTRO
            // Inserir registro
            await conn.execute(`
                INSERT INTO fardamentos_estoque (id_modelo, id_tamanho, id_grupo_economico, 
                uf, sexo, saldo, preco, permite_concessao) 
                VALUES (?,?,?,?,?,?,?,?)`, 
                [id_modelo, id_tamanho, id_grupo_economico, uf, sexo, qtde, preco, permite_concessao]);

            }    
        await conn.execute(`
            INSERT INTO fardamentos_movimento (id_modelo, id_tamanho, id_grupo_economico, uf, sexo, qtde, preco, id_responsavel, data, tipo_movimento)
            VALUES (?,?,?,?,?,?,?,?,?,'abastecimento') 
            `,
            [id_modelo, id_tamanho, id_grupo_economico, uf, sexo, qtde, preco, user.id, data]);
            
        res.status(200).json({message: "Sucesso!"});

    } catch (error) {
        res.status(400).json({message: error.message});
    } finally{
        if(conn) conn.release();
    }
};

function concederFardamento(req) {
    return new Promise( async(resolve,reject) =>{
        let conn;
        try {
            const {id, qtde, id_receptor,dataInicial} = req.body;
            const { user } = req;
            let data = formatDate(dataInicial ? new Date(dataInicial) : new Date(), 'yyyy-MM-dd');
             
            conn = await db.getConnection();

            if (!id) {
                throw new Error ("ID não informado!")
            }

            if (!qtde) {
                throw new Error ("Quantidade não informada")
            }

            if (!id_receptor){
                throw new Error ("O ID do receptor não foi informado!")
            }

            await conn.beginTransaction();
            const [rowsEstoque] = await conn.execute(
                `
                SELECT * FROM fardamentos_estoque 
                WHERE id = ?
                `,[id]
            );
            const estoque = rowsEstoque && rowsEstoque[0];
            if (!estoque || estoque.length === 0) {
                throw new Error('Estoque não encontrado!');
            }
            // const{ id_modelo, id_tamanho, id_grupo_economico, uf, sexo, preco, permite_concessao, saldo } = estoque;
            if (estoque.permite_concessao == 0) {
                throw new Error ("Fardamento não permite concessão/ doação! ");
            }
            if (estoque.saldo < qtde) {
                throw new Error ("A quantidade informada é maior que o saldo atual!")
            }

            await conn.execute (
                `
                UPDATE fardamentos_estoque 
                SET saldo = saldo - ? 
                WHERE id = ?
                `,[qtde, id]
            )
            await conn.execute (
                `
                INSERT INTO fardamentos_movimento 
                (id_modelo, id_tamanho, id_grupo_economico, id_responsavel, id_receptor, uf,
                 sexo, qtde, preco, tipo_movimento, data) VALUES ( ?,?,?,?,?,?,?,?,?,'concessao',?) 
                `,[estoque.id_modelo, estoque.id_tamanho, estoque.id_grupo_economico, user.id, 
                    id_receptor, estoque.uf, estoque.sexo, qtde, estoque.preco, data]
            )
            await conn.commit();
            resolve({message: "Sucesso!"});
            return;
        } catch (error) {
            logger.error({
                module: "PESSOAL/FARDAMENTO",
                origin: "ESTOQUE",
                method: "CONCECEDERFARDAMENTO",
                data : {message: error.message, stack: error.stack, name: error.name},
            });
            if (conn) await conn.rollback();
            reject(error);
            return;
        } finally {
            conn.release();
        }
    });
}

function venderFardamento(req) {
    return new Promise( async(resolve,reject) =>{
        let conn;
        try {
            const {id, qtde, id_receptor,dataInicial} = req.body;
            const { user } = req;
            let data = formatDate(dataInicial ? new Date(dataInicial) : new Date(), 'yyyy-MM-dd');
             
            conn = await db.getConnection();

            if (!id) {
                throw new Error ("ID não informado!")
            }

            if (!qtde) {
                throw new Error ("Quantidade não informada")
            }

            if (!id_receptor){
                throw new Error ("O ID do receptor não foi informado!")
            }

            await conn.beginTransaction();
            const [rowsEstoque] = await conn.execute(
                `
                SELECT * FROM fardamentos_estoque 
                WHERE id = ?
                `,[id]
            );
            const estoque = rowsEstoque && rowsEstoque[0];
            if (!estoque || estoque.length === 0) {
                throw new Error('Estoque não encontrado!');
            }
            // const{ id_modelo, id_tamanho, id_grupo_economico, uf, sexo, preco, permite_concessao, saldo } = estoque;
            if (estoque.permite_concessao == 0) {
                throw new Error ("Fardamento não permite concessão/ doação! ");
            }
            if (estoque.saldo < qtde) {
                throw new Error ("A quantidade informada é maior que o saldo atual!")
            }

            await conn.execute (
                `
                UPDATE fardamentos_estoque 
                SET saldo = saldo - ? 
                WHERE id = ?
                `,[qtde, id]
            )
            await conn.execute (
                `
                INSERT INTO fardamentos_movimento 
                (id_modelo, id_tamanho, id_grupo_economico, id_responsavel, id_receptor, uf,
                 sexo, qtde, preco, tipo_movimento, data) VALUES ( ?,?,?,?,?,?,?,?,?,'venda',?) 
                `,[estoque.id_modelo, estoque.id_tamanho, estoque.id_grupo_economico, user.id, 
                    id_receptor, estoque.uf, estoque.sexo, qtde, estoque.preco, data]
            )
            await conn.commit();
            resolve({message: "Sucesso!"});
            return;
        } catch (error) {
            logger.error({
                module: "PESSOAL/FARDAMENTO",
                origin: "ESTOQUE",
                method: "VENDERFARDAMENTO",
                data : {message: error.message, stack: error.stack, name: error.name},
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
    abastecerEstoque,
    concederFardamento,
    venderFardamento,
};