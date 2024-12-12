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
    conn = conn_externa || (await db.getConnection());

    const params = [];
    let where = " WHERE 1=1 ";

    const { ids } = await getAll({ body: { conn_externa: conn }, query: { filters } });
    let id_list = ids.map((item) => item.id);

    if (id_list.length > 0) {
      where += ` AND id_comissao IN (${id_list.map((value) => db.escape(value)).join(",")}) `;
    } else {
      res.status(200).json([]);
      return;
    }

    const [itens] = await conn.execute(
      `SELECT * FROM comissao_itens ${where} AND manual = 1 ORDER BY id DESC`,
      params
    );

    res.status(200).json(itens);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ALL_ITENS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
