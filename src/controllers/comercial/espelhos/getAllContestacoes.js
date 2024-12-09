const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const getAll = require("./getAll");
const { filter } = require("jszip");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters } = req.query || {};
    const { id_comissao } = filters || {};
    conn = conn_externa || (await db.getConnection());

    const params = [];
    let where = " WHERE 1=1 ";
    if (id_comissao) {
      where += " AND id_comissao =?";
      params.push(id_comissao);
    }

    if (!id_comissao) {
      const { ids } = await getAll({ body: { conn_externa: conn }, query: { filters } });
      const id_list = ids.map((item) => item.id);
      if (id_list.length > 0) {
        where += ` AND id_comissao IN (${id_list.map((value) => db.escape(value)).join(",")}) `;
      }
    }

    const [contestacoes] = await conn.execute(
      `SELECT * FROM comissao_contestacoes ${where} ORDER BY id DESC`,
      params
    );

    res.status(200).json(contestacoes);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ALL_CONTESTACOES",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
