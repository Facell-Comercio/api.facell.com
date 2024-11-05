const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());
    const [rowPlano] = await conn.execute(`SELECT * FROM tim_planos_cbcf_vs_precos WHERE id = ?`, [
      id,
    ]);
    const plano = rowPlano && rowPlano[0];
    res.status(200).json(plano);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "GET_ONE_PLANO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
