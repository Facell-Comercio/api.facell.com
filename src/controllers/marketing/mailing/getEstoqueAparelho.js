const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters } = req.query;
    const { descricao_comercial } = filters || {};

    let where = "WHERE 1=1";
    const params = [];

    if (descricao_comercial) {
      where += " AND de.descricao_comercial LIKE CONCAT('%',?, '%')";
      params.push(descricao_comercial);
    }

    conn = conn_externa || (await db.getConnection());

    const [estoques] = await conn.execute(
      `
      SELECT de.saldo as qtde, f.uf
      FROM datasys_estoque de
      LEFT JOIN filiais f ON f.nome = de.filial_estoque
      ${where}
      AND f.uf IS NOT NULL
      AND de.grupo_estoque = "APARELHO"
      AND de.deposito_atual = "Novos Disponíveis"
      GROUP BY f.uf
      `,
      params
    );

    res.status(200).json(estoques);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "GET_ESTOQUE_APARELHO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
