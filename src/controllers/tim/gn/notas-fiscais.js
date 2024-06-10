const { db } = require("../../../../mysql");
const { insertOneByGN } = require("../../financeiro/contas-a-pagar/titulo-pagar-controller");
const fs = require('fs/promises')
const path = require('path')

function getAll(req) {
    return new Promise(async (resolve, reject) => {

        // Filtros
        const { filters, pagination } = req.query;
        const { pageIndex, pageSize } = pagination || {
            pageIndex: 0,
            pageSize: 10,
        };
        const { range_data, id_grupo_economico, status } = filters || {}

        // console.log(req.query)
        var where = ` WHERE 1=1 `;
        const params = [];
        const limit = pagination ? "LIMIT ? OFFSET ?" : "";

        if (id_grupo_economico && id_grupo_economico !== 'all') {
            where += ` AND f.id_grupo_economico = ?`;
            params.push(id_grupo_economico);
        }
        if (status && status !== 'all') {
            where += ` AND tnf.status = ?`;
            params.push(status);
        }
        if (range_data) {
            const { from: data_de, to: data_ate } = range_data;

            if (data_de && data_ate) {
                where += ` AND data_emissao BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
                    }'  `;
            } else {
                if (data_de) {
                    where += ` AND data_emissao = '${data_de.split("T")[0]}' `;
                }
                if (data_ate) {
                    where += ` AND data_emissao = '${data_ate.split("T")[0]}' `;
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
            LEFT JOIN filiais f ON f.tim_cod_sap = tnf.tim_cod_sap
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
            SELECT DISTINCT tnf.*, f.nome as filial, g.nome as grupo_economico FROM tim_notas_fiscais tnf
            LEFT JOIN filiais f ON f.tim_cod_sap = tnf.tim_cod_sap
            LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            ORDER BY tnf.data_emissao DESC
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

async function insertMany(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const filiais = req.body || {}
            // const filePath = path.join(__dirname, '..', 'exemplos', 'NotasFiscais.js');
            // await fs.writeFile(filePath, JSON.stringify(filiais, null, 2), (err) => {})
            
            await conn.beginTransaction()
            if (!filiais || !filiais?.length) {
                throw new Error('Nenhuma nota fiscal recebida')
            }
            let query = `INSERT IGNORE tim_notas_fiscais (
                tim_cod_sap, 
                nota_fiscal, 
                data_emissao, 
                data_vencimento, 
                valor, 
                descricao
            ) VALUES (?,?,?,?,?,?)`;

            for (const filial of filiais) {
                for (const notaFiscal of filial.notasFiscais) {
                    let tim_cod_sap = filial.tim_cod_sap;

                    let nota_fiscal = parseInt(notaFiscal[0]?.split('-')[0])
                    if(!nota_fiscal){
                        continue;
                    }

                    let data_emissao = notaFiscal[1].split('/').reverse().join('-')
                    let data_vencimento = notaFiscal[2].split('/').reverse().join('-')
                    let valor = String(notaFiscal[3]).replace('.', '').replace(',', '.')
                    let descricao = notaFiscal[4].substring(0, 255)

                    if(!descricao.includes('Fatura SD')){
                        continue;
                    }
                    await conn.execute(query, [
                        tim_cod_sap,
                        nota_fiscal,
                        data_emissao,
                        data_vencimento,
                        valor,
                        descricao
                    ])
                }

            }

            await conn.commit()
            resolve(true)
        } catch (error) {
            console.log('ERROR_GN_INSERT_NOTAS_FISCAIS', error)
            await conn.rollback()
            reject(error)
        } finally {
            conn.release()
        }
    })
}

async function validarRecebimento(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection();
        try {
            // 10 primeiros caracteres dos CNPJ da TIM:
            const cnpjs_validos = ['0420605000', '0242142100', '0242142101', '0420605001']

            const [notas] = await conn.execute(`SELECT tnf.*, f.id as id_filial, f.cnpj as cnpj_filial FROM tim_notas_fiscais tnf 
                LEFT JOIN filiais f ON f.tim_cod_sap = tnf.tim_cod_sap 
                WHERE tnf.status = 'PENDENTE DATASYS' `)

            for (const nota of notas) {
                const [rowsDatasys] = await conn.execute(`SELECT * FROM datasys_fiscal
                 WHERE 
                    SUBSTRING(cnpj_fornecedor, 1, 10) IN(${cnpjs_validos.join(',')})
                    AND nf = ?
                    AND cnpj = ?
                `, [nota.nota_fiscal, nota.cnpj_filial])

                const datasys = rowsDatasys && rowsDatasys[0]
                if (!datasys) {
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
        } finally {
            conn.release()
        }
    })
}

async function lancarFinanceiroEmLote(req) {
    return new Promise(async (resolve, reject) => {
        resolve({message: 'sucesso!'})
        return true
        const conn = await db.getConnection()
        try {

            // * Listar as notas de PENDENTE FINANCEIRO
            const [notas] = await conn.execute(`
            SELECT 
                tnf.*, f.id as id_filial, f.id_grupo_economico
            FROM tim_notas_fiscais tnf
            LEFT JOIN filiais f ON f.tim_cod_sap = tnf.tim_cod_sap
            WHERE status = 'PENDENTE FINANCEIRO' `)
            for (const nota of notas) {

                try {
                    // * Lançar no financeiro
                    const result = await insertOneByGN({
                        ...req, body: {
                            id_filial: nota.id_filial,
                            id_grupo_economico: nota.id_grupo_economico,

                            cnpj_fornecedor: nota.cnpj_fornecedor,

                            data_emissao: nota.data_emissao,
                            data_vencimento: nota.data_vencimento,
                            num_doc: nota.nota_fiscal,
                            valor: nota.valor
                        }
                    })
                    if (!result.id) {
                        throw new Error('Título não criado!')
                    }
                    // * Atualizar a nota
                    await conn.execute(`UPDATE tim_notas_fiscais SET
                    status = 'OK',
                    obs = null,
                    id_titulo = ?
                    
                    `,
                        [
                            result.id
                        ])

                } catch (error) {
                    // ! Atualizar a nota - passando o erro:
                    await conn.execute(`UPDATE tim_notas_fiscais SET
                    status = 'PENDENTE FINANCEIRO',
                    obs = ? WHERE id = ?`,
                        [
                            `ERRO: ${error.message}`,
                            nota.id
                        ])
                }
            }
            resolve(true)
        } catch (error) {
            console.log('ERROR_VALIDAR_RECEBIMENTO_NOTA_FISCAL_TIM', error)
            reject(error)
        } finally {
            conn.release()
        }
    })
}


module.exports = {
    getAll,
    insertMany,
    validarRecebimento,
    lancarFinanceiroEmLote
}