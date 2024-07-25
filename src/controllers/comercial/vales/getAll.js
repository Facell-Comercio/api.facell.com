const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters, pagination } = req.query;
    const { colaborador, id_filial, origem, tipo_data, range_data } =
      filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const params = [];

    let where = ` WHERE 1=1 `;
    if (colaborador) {
      where += ` AND (v.cpf = ? OR v.nome_colaborador LIKE CONCAT('%',?,'%'))`;
      params.push(colaborador, colaborador);
    }
    if (id_filial) {
      where += ` AND v.id_filial = ? `;
      params.push(id_filial);
    }
    if (origem) {
      where += ` AND v.origem LIKE CONCAT('%',?,'%') `;
      params.push(origem);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data = `v.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
              FROM (
                SELECT v.id
                FROM vales v
                LEFT JOIN filiais f ON f.id = v.id_filial 
                ${where}
              ) 
              as subconsulta
              `,
        params
      );
      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const [rows] = await conn.execute(
        `
              SELECT 
                v.*,
                f.nome as filial
              FROM vales v
              LEFT JOIN filiais f ON f.id = v.id_filial 
              ${where}
              
              ORDER BY v.id
              ${limit}
              `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
