const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const updateTotalItem = require("./updateTotalItem");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    if (!id) {
      throw new Error("É necessário informar o ID!");
    }

    await updateTotalItem({
      conn_externa: conn,
      valor: 0,
      id_item: id,
    });

    await conn.execute("DELETE FROM comissao_itens WHERE id = ?", [id]);

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "DELETE_ITEM",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
