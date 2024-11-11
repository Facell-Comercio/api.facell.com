const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());
    const [rowVendedor] = await conn.execute(`SELECT * FROM marketing_vendedores WHERE id = ?`, [
      id,
    ]);
    const vendedor = rowVendedor && rowVendedor[0];
    res.status(200).json(vendedor);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "GET_ONE_VENDEDOR",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
