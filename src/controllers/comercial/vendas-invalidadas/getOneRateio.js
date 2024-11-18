const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());

    const [rowRateio] = await conn.execute(
      "SELECT *, percentual * 100 as percentual FROM comissao_vendas_invalidas_rateio WHERE id = ?",
      [id]
    );
    const rateio = rowRateio && rowRateio[0];
    if (!rateio) {
      throw new Error("Rateio não encontrado!");
    }
    res.status(200).json(rateio);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "GET_ONE_RATEIO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
