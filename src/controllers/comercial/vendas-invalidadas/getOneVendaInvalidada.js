const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());

    const [rowVendaInvalida] = await conn.execute(
      `SELECT * FROM comissao_vendas_invalidas WHERE id = ?`,
      [id]
    );
    const vendaInvalida = rowVendaInvalida && rowVendaInvalida[0];

    if (!vendaInvalida) {
      return res.status(404).json({ message: "Venda não encontrada." });
    }

    const [contestacoes] = await conn.execute(
      `
      SELECT ic.*, u.nome as user, ur.nome as user_resposta
      FROM comissao_vendas_invalidas_contestacoes ic
      LEFT JOIN users u ON u.id = ic.id_user
      LEFT JOIN users ur ON ur.id = ic.id_user_resposta
      WHERE ic.id_venda_invalida = ?`,
      [id]
    );

    const [rateios] = await conn.execute(
      "SELECT *, id_vale IS NULL as canEdit FROM comissao_vendas_invalidas_rateio WHERE id_venda_invalida = ?",
      [id]
    );

    const podeGerarVales =
      ["improcedente", "ciente"].includes(vendaInvalida.status) &&
      rateios.filter((rateio) => rateio.id_vale === null).length > 0;

    res.status(200).json({
      ...vendaInvalida,
      contestacoes,
      rateios,
      podeGerarVales,
    });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "GET_ONE_VENDA_INVALIDA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
