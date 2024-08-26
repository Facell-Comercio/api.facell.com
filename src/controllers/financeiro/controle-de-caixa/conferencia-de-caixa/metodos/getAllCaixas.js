const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    const { id_filial, status_list, range_data, divergentes, nao_resolvidos } =
      filters || {};
    const params = [];
    let where = ` WHERE 1=1 `;

    if (id_filial) {
      where += ` AND dc.id_filial = ? `;
      params.push(id_filial);
    }
    if (status_list && status_list.length > 0) {
      where += ` AND dc.status IN ('${status_list.join("','")}') `;
    }
    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;

      if (data_de && data_ate) {
        where += ` AND dc.data BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND dc.data >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND dc.data <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (divergentes && Number(divergentes)) {
      where += ` AND dc.divergente = 1 `;
    }
    if (nao_resolvidos && Number(nao_resolvidos)) {
      where += ` AND dco.resolvida = 0 `;
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsFiliais] = await conn.execute(
        `
        SELECT nome FROM filiais WHERE id = ?
      `,
        [id_filial]
      );
      const filial = rowsFiliais && rowsFiliais[0];
      const [rowsCaixas] = await conn.execute(
        ` 
          SELECT COUNT(*) AS total
          FROM (
            SELECT 
              dc.id
            FROM datasys_caixas dc
            LEFT JOIN datasys_caixas_ocorrencias dco ON (dco.id_filial = dc.id_filial AND dco.data_caixa = dc.data)
            ${where}
            GROUP BY dc.id
          ) AS subconsulta
          `,
        params
      );
      const totalCaixas = (rowsCaixas && rowsCaixas[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }

      const [caixas] = await conn.execute(
        `
        SELECT 
          dc.*,
          COUNT(dco.id) as ocorrencias
        FROM datasys_caixas dc
        LEFT JOIN datasys_caixas_ocorrencias dco ON (dco.id_filial = dc.id_filial AND dco.data_caixa = dc.data)
        ${where}
        
        GROUP BY dc.id
        ORDER BY dc.data ASC
        ${limit}
        `,
        params
      );

      const objResponse = {
        rows: caixas,
        pageCount: Math.ceil(totalCaixas / pageSize),
        rowCount: totalCaixas,

        filial: filial && filial.nome,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
