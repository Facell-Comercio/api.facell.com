const XLSX = require("xlsx");
const fs = require("fs").promises;
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

function ensureArray(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data;
  }
  // Converte o objeto de volta para um array
  return Object.keys(data).map((key) => data[key]);
}

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const { status_list, filiais_list, tipo_data, range_data } = filters || {};

      conn = await db.getConnection();

      const offset = pageIndex * pageSize;

      let where = "WHERE 1=1";
      const params = [];

      if (status_list && status_list.length > 0) {
        where += ` AND dcb.status IN ('${status_list
          .filter((status) => status !== "atrasado")
          .join("','")}') `;

        if (status_list.includes("atrasado")) {
          where += ` OR (dcb.status = "emitido" AND dcb.data_vencimento < CURDATE()) `;
        }
      }

      if (ensureArray(filiais_list)) {
        where += ` AND f.id IN(${ensureArray(filiais_list).join(",")}) `;
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          where += ` AND dcb.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND dcb.${tipo_data} = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND dcb.${tipo_data} = '${data_ate.split("T")[0]}' `;
          }
        }
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde FROM datasys_caixas_boletos dcb
        LEFT JOIN filiais f ON f.id = dcb.id_filial
        ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = " LIMIT ? OFFSET ? ";
      params.push(pageSize);
      params.push(offset);

      const [rows] = await conn.execute(
        `SELECT 
            dcb.*, f.nome as filial,
            CASE WHEN dcb.status = "emitido" AND dcb.data_vencimento < CURDATE() THEN "atrasado" ELSE dcb.status END as status
        FROM datasys_caixas_boletos dcb
        LEFT JOIN filiais f ON f.id = dcb.id_filial
        ${where}
        ORDER BY dcb.data DESC
        ${limit}`,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_ALL_BOLETOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn) conn.release();
    }
  });
};
