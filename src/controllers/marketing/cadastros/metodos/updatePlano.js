const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, plano, produto_nao_fidelizado, produto_fidelizado } = req.body;
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    if (!id) {
      throw new Error("ID não informado");
    }
    if (!plano) {
      throw new Error("Plano não informado");
    }
    if (!produto_fidelizado) {
      throw new Error("Campo de produto fidelizado não informado");
    }
    if (!produto_nao_fidelizado) {
      throw new Error("Campo de produto não fidelizado não informado");
    }

    await conn.execute(
      "UPDATE tim_planos_cbcf_vs_precos SET plano = ?, produto_nao_fidelizado = ?, produto_fidelizado = ? WHERE id = ?",
      [plano, produto_nao_fidelizado, produto_fidelizado, id]
    );
    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "UPDATE_PLANO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
