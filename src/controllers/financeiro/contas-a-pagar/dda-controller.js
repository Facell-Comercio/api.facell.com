const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const fs = require('fs/promises');
const { remessaToObject } = require("../remessa/to-object");

async function getAll(req) {
    return new Promise(async (resolve, reject) => {

        const conn = await db.getConnection();
        try {
            const { filters, pagination } = req.query;
            const { pageIndex, pageSize } = pagination || {
                pageIndex: 0,
                pageSize: 15,
            };
            const {
                id_filial,
                termo,
                vinculados,
                naoVinculados,
                tipo_data,
                range_data
            } = filters || {};

            let where = ` WHERE 1=1 `;
            const params = [];

            if (id_filial) {
                where += ` AND f.id = ? `;
                params.push(id_filial);
            }

            if (termo) {
                where += ` AND (
                        dda.cod_barras LIKE CONCAT(?,"%") OR
                        dda.nome_fornecedor LIKE CONCAT("%",?,"%") OR
                      ) `;
                params.push(termo);
                params.push(termo);
            }
            if (tipo_data && range_data) {
                const { from: data_de, to: data_ate } = range_data;
                if (data_de && data_ate) {
                    where += ` AND b.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
                        }'  `;
                } else {
                    if (data_de) {
                        where += ` AND b.${tipo_data} = '${data_de.split("T")[0]}' `;
                    }
                    if (data_ate) {
                        where += ` AND b.${tipo_data} = '${data_ate.split("T")[0]}' `;
                    }
                }
            }

            const offset = pageIndex * pageSize;

            const [rowQtdeTotal] = await conn.execute(
                `SELECT COUNT(dda.id) AS qtde 
                FROM fin_dda as dda 
                LEFT JOIN filiais f ON f.cnpj = dda.cnpj_filial
                ${where}
                
                `,
                params
            );

            const qtdeTotal =
                (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
            params.push(pageSize);
            params.push(offset);

            const query = `
              SELECT dda.*, f.id as id_filial
              FROM fin_dda as dda
              LEFT JOIN filiais f ON f.cnpj = dda.cnpj_filial
              ${where}
              LIMIT ? OFFSET ?
            `;

            const [rows] = await conn.execute(query, params);

            const objResponse = {
                rows: rows,
                pageCount: Math.ceil(qtdeTotal / pageSize),
                rowCount: qtdeTotal,
            };
            resolve(objResponse);
        } catch (error) {
            logger.error({
                module: "FINANCEIRO",
                origin: "DDA",
                method: "GET_ALL",
                data: { message: error.message, stack: error.stack, name: error.name },
            });
            reject(error);
        } finally {
            conn.release();
        }
    });

}

async function importDDA(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            const files = req.files
            if (!files || !files.length) {
                throw new Error('Arquivos não recebidos!')
            }

            let index = 1;
            const result = []
            for (const file of files) {
                let resultFile = {
                    erro: false,
                    message: `Arquivo ${index}: Importação realizada`,
                };
                const filePath = file?.path;
                try {
                    if (!filePath) {
                        throw new Error('O arquivo não importado corretamente!');
                    }

                    // Ler e fazer parse do arquivo
                    const data = await fs.readFile(filePath, 'utf8')
                    const objRemessa = await remessaToObject(data)

                    let qtdeImportada = 0;
                    // Passagem pelos lotes
                    const lotes = objRemessa.lotes
                    if (!lotes || !lotes.length) {
                        throw new Error('Aquivo vazio ou não foi possível acessar os lotes de boletos...')
                    }
                    for (const lote of lotes) {
                        // Passagem pelos segmentos G
                        const segmentos = lote.detalhe?.filter(d => d.cod_seg_registro_lote === 'G')
                        if (!segmentos || !segmentos.length) {
                            continue;
                        }
                        for (const segmento of segmentos) {
                            const params = [
                                String(lote.loteHeader.cnpj_empresa).padStart(14, '0'),
                                segmento.banco,
                                segmento.cod_barras,
                                String(segmento.cnpj_fornecedor).padStart(14, '0'),
                                segmento.nome_fornecedor,
                                segmento.data_vencimento,
                                segmento.valor,
                                segmento.num_doc_cobranca,
                                segmento.data_emissao,
                                segmento.agencia,
                                segmento.dac,
                                segmento.carteira,
                                segmento.especie_titulo,
                            ]
                            // console.log(params)
                            await conn.execute(`INSERT IGNORE fin_dda 
                    (
                        cnpj_filial,
                        cod_banco,
                        cod_barras,
                        cnpj_fornecedor,
                        nome_fornecedor,
                        data_vencimento,
                        valor,
                        documento,
                        data_emissao,
                        agencia,
                        dac,
                        modalidade_carteira,
                        especie_boleto
                    ) 
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`, params)

                            qtdeImportada++
                        }
                    }

                } catch (error) {
                    resultFile.erro = true
                    resultFile.message = `Erro: ${error.message}`

                } finally {
                    index++;
                    try {
                        await fs.unlink(filePath);
                    } catch (unlinkErr) {
                        logger.error({
                            module: 'FINANCEIRO', origin: 'DDA', method: 'UNLINK IMPORT',
                            data: { message: unlinkErr.message, stack: unlinkErr.stack, name: unlinkErr.name }
                        })
                    }
                    result.push(resultFile)
                }
            }

            await conn.commit()

            await autoVincularDDA()
            // resolve({ qtdeImportada })
            resolve(result)
        } catch (error) {
            await conn.rollback()
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'DDA', method: 'IMPORT',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            conn.release()
        }
    })
}

async function autoVincularDDA() {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            await conn.beginTransaction()

            const [boletos] =  await conn.execute(`SELECT 
                id, 
                cnpj_filial, 
                cnpj_fornecedor, 
                valor 
                FROM fin_dda WHERE id_vencimento is NULL`)
            for(const boleto of boletos){
                boleto.vinculado = false;
                boleto.id_vencimento = null;

                const params = [   
                    boleto.valor,
                    boleto.cnpj_filial,
                    boleto.cnpj_fornecedor
                ]
                // console.log(params)
                const [rowVencimento] = await conn.execute(`SELECT
                    v.id, 
                    v.valor,
                    f.cnpj as cnpj_filial,
                    ff.cnpj as cnpj_fornecedor
                    
                    FROM fin_cp_titulos_vencimentos v 
                    INNER JOIN fin_cp_titulos t ON t.id = v.id_titulo
                    LEFT JOIN fin_dda dda ON dda.id_vencimento = v.id 
                    LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
                    LEFT JOIN filiais f ON f.id = t.id_filial
                    WHERE 
                        dda.id_vencimento IS NULL
                        AND v.valor = ?
                        AND f.cnpj = ?
                        AND ff.cnpj = ?
                    LIMIT 1
                    `,
                    params)
                    const vencimento = rowVencimento && rowVencimento[0]
                    if(vencimento){
                        await conn.execute(`UPDATE fin_dda SET id_vencimento = ? WHERE id = ?`, [vencimento.id, boleto.id])
                        boleto.vinculado = true,
                        boleto.id_vencimento = vencimento.id
                    }
                    
                    // console.log({
                    //     match: !!vencimento,
                    //     boleto,
                    //     vencimento
                    // })
            }
            await conn.commit()
            resolve(boletos)
        } catch (error) {
            await conn.rollback()
            reject(error)
        }finally{
            conn.release()
        }
    })
}

async function exportDDA() {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const [boletos] = await conn.execute(`SELECT 
                *
                FROM fin_dda `)

            resolve(boletos)
        } catch (error) {
            reject(error)
        }finally{
            conn.release()
        }
    })
}

async function limparDDA() {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            await conn.execute(`DELETE FROM fin_dda WHERE id_vencimento IS NULL`)
            resolve(true)
        } catch (error) {
            reject(error)
        }finally{
            conn.release()
        }
    })
}

async function vincularDDA(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const {  id_vencimento, id_dda } = req.body
            if(!id_vencimento){
                throw new Error('ID do vencimento não informado!')
            }
            if(!id_dda){
                throw new Error('ID do DDA não informado!')
            }

            // ^ Verificar se o Vencimento existe
            const [rowVencimento] = await conn.execute(`SELECT id FROM fin_cp_titulos_vencimentos WHERE id = ?`, [id_vencimento])
            if(rowVencimento && !rowVencimento.length){
                throw new Error(`Vencimento de ID ${id_vencimento} não existe!`)
            }

            //^ Verificar se o registro no DDA já consta vinculado
            const [rowDDA] = await conn.execute(`SELECT id, id_vencimento FROM fin_dda 
             WHERE   
                id = ?`, [id_dda])

            if(!rowDDA && !rowDDA.length){
                throw new Error(`Registro ${id_dda} do DDA não existe!`)
            }
            const DDAbanco = rowDDA && rowDDA[0]
            //^ Se tem ID Vencimento no DDA então já está vinculado:
            if(DDAbanco.id_vencimento){
                throw new Error(`Registro ${id_dda} do DDA já consta como vinculado, não deu para vincular com o id_vencimento ${DDAbanco.id_vencimento}`)
            }

            // * Vinculação
            await conn.execute(`UPDATE fin_dda SET id_vencimento = ? WHERE id = ?`, [id_vencimento, id_dda])
            resolve(true)
        } catch (error) {
            reject(error)
        }finally{
            conn.release()
        }
    })
}

module.exports = {
    getAll,
    importDDA,
    exportDDA,
    limparDDA,
    autoVincularDDA,
    vincularDDA,
}