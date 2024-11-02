const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    if (!id) {
      throw new Error("ID não informado");
    }

    await conn.execute("DELETE FROM tim_planos_cbcf_vs_precos WHERE id = ?", [id]);
    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "DELETE_PLANO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
