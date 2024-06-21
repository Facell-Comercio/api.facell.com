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
            } = filters || {};

            let where = ` WHERE 1=1 `;
            const params = [];

            if (id_filial) {
                where += ` AND f.id = ? `;
                params.push(id_filial);
            }

            if (termo) {
                where += ` AND (
                        b.id LIKE CONCAT(?,"%") OR
                        cb.descricao LIKE CONCAT("%",?,"%") OR
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
                ${where}
                
                `,
                params
            );

            const qtdeTotal =
                (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
            params.push(pageSize);
            params.push(offset);

            const query = `
              SELECT
                
      
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

async function importFile(req) {
    return new Promise(async (resolve, reject) => {
        const filePath = req.file?.path;
        try {
            if(!filePath){
                throw new Error('Arquivo não recebido!')
            }
            // Ler e fazer parse do arquivo
            const data = await fs.readFile(filePath, 'utf8')
            const obj = remessaToObject(data)

            resolve(obj)
        } catch (error) {
            reject(error)
        }finally{
            try {
                await fs.unlink(filePath);
              } catch (unlinkErr) {
                console.error('Erro ao remover o arquivo temporário', unlinkErr);
              }
        }
    })
}


module.exports = {
    getAll,
    importFile
}