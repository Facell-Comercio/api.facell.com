const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros

  let conn;

  try {
    const { id } = req.params;

    conn = await db.getConnection();

    if (!id) {
      throw new Error("ID não informado!");
    }

    await conn.execute("DELETE FROM perfis WHERE id = ?", [id]);

    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "ADM",
      origin: "PERFIS",
      method: "DELETE_PERFIL",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
