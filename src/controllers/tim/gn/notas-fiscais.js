const { db } = require("../../../../mysql");

function getAll(req) {
    return new Promise(async (resolve, reject) => {

        // Filtros
        const { filters, pagination } = req.query;
        const { pageIndex, pageSize } = pagination || {
            pageIndex: 0,
            pageSize: 10,
        };
        const { range_data, codMaterial, descricao, id_grupo_economico } = filters || {}

        var where = ` WHERE 1=1 `;
        const params = [];
        const limit = pagination ? "LIMIT ? OFFSET ?" : "";

        if (codMaterial) {
            where += ` AND tnf.codMaterial LIKE CONCAT('%', ?, '%')`;
            params.push(codMaterial);
        }

        if (descricao) {
            where += ` AND tnf.descricao LIKE CONCAT('%', ?, '%')`;
            params.push(descricao);
        }
        if (id_grupo_economico && id_grupo_economico !== 'all') {
            where += ` AND tnf.id_grupo_economico = ?`;
            params.push(id_grupo_economico);
        }
        if (range_data) {
            const { from: data_de, to: data_ate } = range_data;

            if (data_de && data_ate) {
                where += ` AND dtCriacao BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
                    }'  `;
            } else {
                if (data_de) {
                    where += ` AND dtCriacao = '${data_de.split("T")[0]}' `;
                }
                if (data_ate) {
                    where += ` AND dtCriacao = '${data_ate.split("T")[0]}' `;
                }
            }
        }

        const offset = pageIndex * pageSize;

        const conn = await db.getConnection();
        try {
            const [rowQtdeTotal] = await conn.execute(
                `SELECT 
            COUNT(tnf.id) as qtde 
            FROM tim_notas_fiscais tnf
             ${where} `,
                params
            );
            const qtdeTotal =
                (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

            if (limit) {
                params.push(pageSize);
                params.push(offset);
            }
            var query = `
            SELECT tnf.*, g.nome as grupo_economico FROM tim_notas_fiscais tnf
            LEFT JOIN filiais f ON f.id = tnf.id_filial
            LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            ORDER BY tnf.id DESC
            ${limit}
            `;
            const [rows] = await conn.execute(query, params);

            const objResponse = {
                rows: rows,
                pageCount: Math.ceil(qtdeTotal / pageSize),
                rowCount: qtdeTotal,
            };
            resolve(objResponse);
        } catch (error) {
            console.log('ERROR_GET_FATURADOS_TIM', error)
            reject(error);
        } finally {
            conn.release();
        }
    });
}

async function validarRecebimento(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection();
        try {
            // 10 primeiros caracteres dos CNPJ da TIM:
            const cnpjs_validos = ['0420605000', '0242142100','0242142101','0420605001']

            const [notas] = await conn.execute(`SELECT * FROM tim_notas_fiscais WHERE status = 'PENDENTE DATASYS' `)
            
            for(const nota of notas){
                const [rowsDatasys] = await conn.execute(`SELECT * FROM datasys_fiscal
                 WHERE 
                    cnpj_fornecedor IN(${cnpjs_validos.join(',')})
                    AND nota_fiscal = ?
                    AND id_filial = ?
                `, [nota.nota_fiscal, nota.id_filial]) 

                const datasys = rowsDatasys && rowsDatasys[0]
                if(!datasys){
                    continue
                }

                // * Atualiza o status de recebimento da nota fiscal com os dados do Datasys:
                await conn.execute(`UPDATE tim_notas_fiscais 
                SET 
                    status = 'PENDENTE FINANCEIRO', 
                    cnpj_fornecedor = ?, 
                    chave_nf = ?,
                    data_recebimento = ?
                    
                    WHERE id = ?`, 
                [
                    datasys.cnpj_fornecedor, 
                    datasys.chave_nf, 
                    datasys.data_entrada,

                    nota.id
                ])
            }
            resolve(true)
        } catch (error) {
            console.log('ERROR_VALIDAR_RECEBIMENTO_NOTA_FISCAL_TIM', error)
            reject(error)
        }finally{
            conn.release()
        }
    })
}

async function lancarFinanceiroEmLote(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            // * Listar as notas de PENDENTE FINANCEIRO
            const [notas] = await conn.execute(`SELECT * FROM tim_notas_fiscais WHERE status = 'PENDENTE FINANCEIRO' `)
            for(const nota of notas){
                // * Lançar no financeiro
                const result = await insertOneBy
                // * Atualizar a nota
                await conn.execute(`UPDATE tim_notas_fiscais SET
                    status = 'OK',
                    id_titulo = 
                    
                `,
                [])
            }

            await conn.commit()
            resolve(true)
        } catch (error) {
            conn.rollback()
            console.log('ERROR_VALIDAR_RECEBIMENTO_NOTA_FISCAL_TIM', error)
            reject(error)
        }finally{
            conn.release()
        }
    })
}


module.exports = {
    getAll,
    validarRecebimento,
    lancarFinanceiroEmLote
}