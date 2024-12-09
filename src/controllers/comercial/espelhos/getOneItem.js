const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;

    conn = conn_externa || (await db.getConnection());

    const [rowItem] = await conn.execute(
      "SELECT *, atingimento * 100 as atingimento FROM comissao_itens WHERE id = ?",
      [id]
    );
    const item = rowItem && rowItem[0];
    if (!item) {
      throw new Error("Item não encontrado!");
    }
    res.status(200).json(item);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ONE_ITEM",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
