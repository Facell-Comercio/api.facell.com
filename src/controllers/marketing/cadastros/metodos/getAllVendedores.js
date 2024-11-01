const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo } = filters || {};

    let where = "WHERE 1=1";
    const params = [];

    if (termo) {
      where += " AND nome LIKE CONCAT('%',?, '%')";
      params.push(termo);
    }

    conn = conn_externa || (await db.getConnection());

    const [rowQtdeTotal] = await conn.execute(
      `SELECT id FROM marketing_vendedores ${where}`,
      params
    );
    const qtdeTotal = (rowQtdeTotal && rowQtdeTotal.length) || 0;

    const limit = pagination ? " LIMIT ? OFFSET ? " : "";
    if (limit) {
      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);
    }
    const [vendedores] = await conn.execute(
      `SELECT * FROM marketing_vendedores ${where}  ORDER BY id DESC ${limit}`,
      params
    );

    const objResponse = {
      rows: vendedores,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "GET_ALL_VENDEDORES",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
