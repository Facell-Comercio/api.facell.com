const { formatDate } = require("date-fns");
const { db } = require("../../../../mysql");
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
        const { range_data, codMaterial, descricao, id_grupo_economico } = filters || {}

        var where = ` WHERE 1=1 `;
        const params = [];
        const limit = pagination ? "LIMIT ? OFFSET ?" : "";

        if (codMaterial) {
            where += ` AND tp.cod_material LIKE CONCAT('%', ?, '%')`;
            params.push(codMaterial);
        }

        if (descricao) {
            where += ` AND tp.descricao LIKE CONCAT('%', ?, '%')`;
            params.push(descricao);
        }
        if (id_grupo_economico && id_grupo_economico !== 'all') {
            where += ` AND f.id_grupo_economico = ?`;
            params.push(id_grupo_economico);
        }
        if (range_data) {
            const { from: data_de, to: data_ate } = range_data;
      
            if (data_de && data_ate) {
              where += ` AND data_pedido BETWEEN '${data_de.split("T")[0]}' AND '${
                data_ate.split("T")[0]
              }'  `;
            } else {
              if (data_de) {
                where += ` AND data_pedido = '${data_de.split("T")[0]}' `;
              }
              if (data_ate) {
                where += ` AND data_pedido = '${data_ate.split("T")[0]}' `;
              }
            }
          }

        const offset = pageIndex * pageSize;

        const conn = await db.getConnection();
        try {
            const [rowQtdeTotal] = await conn.execute(
                `SELECT 
            COUNT(tp.id) as qtde 
            FROM tim_pedidos tp
            LEFT JOIN filiais f ON f.tim_cod_sap = tp.tim_cod_sap
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
            SELECT tp.*, g.nome as grupo_economico FROM tim_pedidos tp
            LEFT JOIN filiais f ON f.tim_cod_sap = tp.tim_cod_sap
            LEFT JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            ${where}
            ORDER BY tp.data_pedido DESC
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
            console.log('ERROR_GET_PEDIDOS_TIM',error)
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
            // const filePath = path.join(__dirname, '..', 'exemplos', 'Pedidos.js');
            // await fs.writeFile(filePath, JSON.stringify(filiais, null, 2), (err) => {})

            await conn.beginTransaction()
            if (!filiais || !filiais?.length) {
                throw new Error("Pedidos não recebidos ou inexistentes no período")
            }

            for(const filial of filiais){
                if(!filial?.pedidos || !filial?.pedidos?.length){ continue ;}

                if (!filial.data_inicial || !filial.data_final) {
                    throw new Error('Data Inicial ou Final não informadas!')
                }

                let data_inicial = formatDate(filial.data_inicial, 'yyyy-MM-dd')
                let data_final = formatDate(filial.data_final, 'yyyy-MM-dd')

                // ! Deleta os dados capturados anteriormente
                await conn.execute(`DELETE FROM tim_pedidos WHERE tim_cod_sap = ? AND data_pedido BETWEEN ? AND ? `, [
                    filial.tim_cod_sap, 
                    data_inicial, 
                    data_final
                ]) 

                let query = `INSERT INTO tim_pedidos (
                    data_inicial,
                    data_final,
                    tim_cod_sap,
                    id_filial,

                    pedido,
                    data_pedido,
                    cod_material,
                    descricao,
                    qtde_solicitada,
                    qtde_atendida,
                    status
                    
                    )
                    VALUES
                    `
                let values = ''
    
                for (const pedido of filial.pedidos) {
                    let tim_cod_sap = filial.tim_cod_sap;
                    let id_filial = filial.id;
                    
                    let num_pedido = parseInt(pedido[0]);
                    if(!num_pedido || pedido[3] == "Total:"){
                        continue;
                    }
                    let data_pedido = pedido[1].split('/').reverse().join('-');
                    let cod_material = pedido[2]?.substring(0,80);
                    let descricao = pedido[3]?.substring(0,255);
                    let qtde_solicitada = pedido[4];
                    let qtde_atendida = pedido[5];
                    let status = pedido[6]?.substring(0,120);

                    values += `(
                        ${conn.escape(data_inicial)},
                        ${conn.escape(data_final)},
                        ${conn.escape(tim_cod_sap)},
                        ${conn.escape(id_filial)},
                        ${conn.escape(num_pedido)},
                        ${conn.escape(data_pedido)},
                        ${conn.escape(cod_material)},
                        ${conn.escape(descricao)},
                        ${conn.escape(qtde_solicitada)},
                        ${conn.escape(qtde_atendida)},
                        ${conn.escape(status)}
                    ),`
                }
                values = values.substring(0, values.length -1)
                await conn.execute(query + values)
            }

            await conn.commit()
            resolve(true)
        } catch (error) {
            console.log('ERRO_GN_INSERT_PEDIDOS',error)
            await conn.rollback()
            reject(error)
        }
    })
}

module.exports = {
    getAll,
    insertMany
}