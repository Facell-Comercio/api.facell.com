const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { formatDate } = require("date-fns");
const { ensureArray } = require("../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters, pagination } = req.query;
    const { conn_externa } = req.body;

    const { mes, ano } = filters || {};

    let where = "WHERE 1=1";
    const params = [];

    if (mes) {
      where += " AND MONTH(data) = ?";
      params.push(mes);
    }
    if (ano) {
      where += " AND YEAR(data) = ?";
      params.push(ano);
    }

    let conn;

    try {
      conn = conn_externa || (await db.getConnection());

      console.log(`SELECT * FROM marketing_mailing_campanhas ${where}`);

      const [campanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas ${where}`,
        params
      );
      for (const campanha of campanhas) {
        const [clientes] = await conn.execute(
          `SELECT * FROM marketing_mailing_clientes WHERE id_campanha = ?`,
          [campanha.id]
        );

        campanha.clientes = clientes;

        const [subcampanhas] = await conn.execute(
          `SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?`,
          [campanha.id]
        );
        const nomes_subcampanhas =
          subcampanhas && subcampanhas.map((subcampanha) => subcampanha.nome);
        for (const subcampanha of subcampanhas) {
          const [clientes] = await conn.execute(
            `SELECT * FROM marketing_mailing_clientes WHERE id_campanha = ?`,
            [subcampanha.id]
          );
          subcampanha.clientes = clientes;
        }
        campanha.subcampanhas = subcampanhas;
        campanha.nomes_subcampanhas = nomes_subcampanhas;
      }

      resolve(campanhas);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_CAMPANHAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
