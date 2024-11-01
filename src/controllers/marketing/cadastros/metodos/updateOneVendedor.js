const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, nome } = req.body;
    conn = conn_externa || (await db.getConnection());

    if (!id) {
      throw new Error("ID do vendedor é obrigatório");
    }
    if (!nome) {
      throw new Error("Nome do vendedor é obrigatório");
    }

    await conn.beginTransaction();
    await conn.execute(`UPDATE marketing_vendedores nome = ? WHERE id = ?`, [nome, id]);
    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "INSERT_ONE_VENDEDOR",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
