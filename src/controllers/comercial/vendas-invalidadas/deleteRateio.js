const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());
    if (!id) {
      throw new Error("É necessário informar o ID!");
    }
    const [rowRateio] = await conn.execute(
      "SELECT id, id_vale FROM comissao_vendas_invalidas_rateio WHERE id =?",
      [id]
    );
    const rateio = rowRateio && rowRateio[0];
    if (rateio.id_vale) {
      throw new Error("Não é possível deletar este rateio pois já está vinculado a um vale!");
    }
    await conn.execute("DELETE FROM comissao_vendas_invalidas_rateio WHERE id = ?", [id]);
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "DELETE_RATEIO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
