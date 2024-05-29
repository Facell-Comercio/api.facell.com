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
            where += ` AND tpf.codMaterial LIKE CONCAT('%', ?, '%')`;
            params.push(codMaterial);
        }

        if (descricao) {
            where += ` AND tpf.descricao LIKE CONCAT('%', ?, '%')`;
            params.push(descricao);
        }
        if (id_grupo_economico && id_grupo_economico !== 'all') {
            where += ` AND tpf.id_grupo_economico = ?`;
            params.push(id_grupo_economico);
        }
        if (range_data) {
            const { from: data_de, to: data_ate } = range_data;
      
            if (data_de && data_ate) {
              where += ` AND dtCriacao BETWEEN '${data_de.split("T")[0]}' AND '${
                data_ate.split("T")[0]
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
            COUNT(tpf.id) as qtde 
            FROM tim_pedidos_faturados tpf
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
            JOIN grupos_economicos g ON g.id = tpf.id_grupo_economico
            ${where}
            ORDER BY tpf.dtCriacao DESC
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
            console.log('ERROR_GET_FATURADOS_TIM',error)
            reject(error);
        } finally {
            conn.release();
        }
    });
}


module.exports = {
    getAll
}