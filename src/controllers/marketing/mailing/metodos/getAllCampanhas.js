const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const { mes, ano, active, nome } = filters || {};

      let where = "WHERE 1=1";
      const params = [];

      if (mes) {
        where += " AND MONTH(data_inicio) = ?";
        params.push(mes);
      }
      if (ano) {
        where += " AND YEAR(data_inicio) = ?";
        params.push(ano);
      }
      if (active !== undefined && active !== "all") {
        where += " AND active = ?";
        params.push(active ? 1 : 0);
      }
      if (nome) {
        where += " AND nome LIKE CONCAT('%',?, '%')";
        params.push(nome);
      }

      conn = conn_externa || (await db.getConnection());

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(id) as qtde FROM marketing_mailing_campanhas ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const [campanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas
        ${where} ${limit}
        ORDER BY data_inicio`,
        params
      );

      //* CONTANDO A QUANTIDADE DE CLIENTES
      for (const campanha of campanhas) {
        const [subcampanhas] = await conn.execute(
          `SELECT id FROM marketing_mailing_campanhas WHERE id_parent = ?`,
          [campanha.id]
        );
        const ids = subcampanhas && subcampanhas.map((campanha) => campanha.id);
        ids.push(campanha.id);
        const [clientes] = await conn.execute(
          `SELECT COUNT(id) as qtde FROM marketing_mailing_clientes WHERE id_campanha IN ('${ids.join(
            "','"
          )}')`
        );
        campanha.qtde_clientes = (clientes && clientes[0] && clientes[0].qtde) || 0;
      }

      const objResponse = {
        rows: campanhas,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_CAMPANHAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
