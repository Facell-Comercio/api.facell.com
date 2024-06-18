const { formatDate } = require("date-fns");
const { db } = require("../../../../mysql");
const fs = require('fs/promises')
const path = require('path');
const { logger } = require("../../../../logger");

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
            where += ` AND tpf.cod_material LIKE CONCAT('%', ?, '%')`;
            params.push(codMaterial);
        }

        if (descricao) {
            where += ` AND tpf.descricao LIKE CONCAT('%', ?, '%')`;
            params.push(descricao);
        }
        if (id_grupo_economico && id_grupo_economico !== 'all') {
            where += ` AND f.id_grupo_economico = ?`;
            params.push(id_grupo_economico);
        }
        if (range_data) {
            const { from: data_de, to: data_ate } = range_data;

            if (data_de && data_ate) {
                where += ` AND data_criacao BETWEEN '${data_de.split("T")[0]}' AND '${data_ate.split("T")[0]
                    }'  `;
            } else {
                if (data_de) {
                    where += ` AND data_criacao = '${data_de.split("T")[0]}' `;
                }
                if (data_ate) {
                    where += ` AND data_criacao = '${data_ate.split("T")[0]}' `;
                }
            }
        }

        const offset = pageIndex * pageSize;

        const conn = await db.getConnection();
        try {
            const [rowQtdeTotal] = await conn.execute(
                `SELECT 
            COUNT(tpf.id) as qtde 
            FROM tim_pedidos_faturados tpf
            LEFT JOIN filiais f ON f.tim_cod_sap = tpf.tim_cod_sap
            LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico
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
            SELECT tpf.*, g.nome as grupo_economico FROM tim_pedidos_faturados tpf
            LEFT JOIN filiais f ON f.tim_cod_sap = tpf.tim_cod_sap
            LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            ORDER BY tpf.data_criacao DESC
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
            logger.error({
                module: 'TIM', origin: 'GN FATURADOS', method: 'GET_ALL',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
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
            // const filePath = path.join(__dirname, '..', 'exemplos', 'Faturados.js');
            // await fs.writeFile(filePath, JSON.stringify(filiais, null, 2), (err) => {})

            await conn.beginTransaction()
            if (!filiais || !filiais?.length) {
                throw new Error("Faturados não recebidos ou inexistentes no período")
            }

            for (const filial of filiais) {
                if (!filial?.faturados || !filial?.faturados?.length) { continue; }
                if (!filial.data_inicial || !filial.data_final) {
                    throw new Error('Data Inicial ou Final não informadas!')
                }

                let data_inicial = formatDate(filial.data_inicial, 'yyyy-MM-dd')
                let data_final = formatDate(filial.data_final, 'yyyy-MM-dd')

                // ! Deleta os dados capturados anteriormente
                await conn.execute(`DELETE FROM tim_pedidos_faturados WHERE tim_cod_sap = ? AND data_criacao BETWEEN ? AND ? `, [
                    filial.tim_cod_sap,
                    data_inicial,
                    data_final
                ])

                let query = `INSERT INTO tim_pedidos_faturados (
                    data_inicial,
                    data_final,
                    tim_cod_sap,
                    id_filial,

                    nota_fiscal,
                    data_criacao,
                    pedido,
                    cod_material,
                    descricao,
                    qtde,
                    valor_unitario,
                    valor_total
                    )
                    VALUES
                    `
                let values = ''

                for (const faturado of filial.faturados) {

                    let tim_cod_sap = filial.tim_cod_sap;
                    let id_filial = filial.id;

                    let nota_fiscal = parseInt(faturado[0]);
                    if (!nota_fiscal || faturado[6] == "Total:") {
                        continue;
                    }
                    let data_criacao = faturado[1].split('/').reverse().join('-');
                    let pedido = faturado[2]?.substring(0, 30);
                    let cod_material = faturado[3]?.substring(0, 80);
                    let descricao = faturado[4]?.substring(0, 255);
                    let qtde = parseInt(faturado[5])
                    let valor_unitario = String(faturado[6]).replace('.', '').replace(',', '.')
                    let valor_total = String(faturado[7]).replace('.', '').replace(',', '.')

                    values += `(
                        ${conn.escape(data_inicial)},
                        ${conn.escape(data_final)},
                        ${conn.escape(tim_cod_sap)},
                        ${conn.escape(id_filial)},

                        ${conn.escape(nota_fiscal)},
                        ${conn.escape(data_criacao)},
                        ${conn.escape(pedido)},
                        ${conn.escape(cod_material)},
                        ${conn.escape(descricao)},
                        ${conn.escape(qtde)},
                        ${conn.escape(valor_unitario)},
                        ${conn.escape(valor_total)}
                    ),`
                }
                values = values.substring(0, values.length - 1)
                await conn.execute(query + values)
            }

            await conn.commit()
            resolve(true)
        } catch (error) {
            logger.error({
                module: 'TIM', origin: 'GN FATURADOS', method: 'INSERT_MANY',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
            await conn.rollback()
            reject(error)
        } finally {
            conn.release()
        }
    })
}


module.exports = {
    getAll,
    insertMany
}