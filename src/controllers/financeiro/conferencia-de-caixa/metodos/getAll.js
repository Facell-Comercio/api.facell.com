const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
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
      where += ` AND dc.status_conferencia IN ('${status_list.join("','")}') `;
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
    // if (nao_resolvidos && Number(nao_resolvidos)) {
    //   where += ` AND dc.divergentes = 1 `;
    // }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsCaixas] = await conn.execute(
        ` SELECT COUNT(dc.id) as total 
          FROM datasys_caixas dc
          LEFT JOIN datasys_caixas_ocorrencias dco ON dco.id_filial = dc.id_filial AND dco.data = dc.data
          ${where}
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
          COALESCE(SUM(dco.resolvida = 0),0) as ocorrencias
        FROM datasys_caixas dc
        LEFT JOIN datasys_caixas_ocorrencias dco ON dco.id_filial = dc.id_filial AND dco.data = dc.data
        ${where}
        
        GROUP BY dc.id
        ${limit}
        `,
        params
      );
      const objResponse = {
        rows: caixas,
        pageCount: Math.ceil(totalCaixas / pageSize),
        rowCount: totalCaixas,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA DE CAIXA",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
