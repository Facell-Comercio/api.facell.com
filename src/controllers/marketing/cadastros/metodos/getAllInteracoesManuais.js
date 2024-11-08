const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { operador, observacao, cliente } = filters || {};

    let where = "WHERE plataforma = 'manual'";
    const params = [];

    if (operador) {
      where += " AND operador LIKE CONCAT('%',?, '%')";
      params.push(operador);
    }
    if (observacao) {
      where += " AND observacao LIKE CONCAT('%',?, '%')";
      params.push(operador);
    }
    if (cliente) {
      where += " AND nome_assinante LIKE CONCAT('%',?, '%')";
      params.push(cliente);
    }

    conn = conn_externa || (await db.getConnection());

    const [rowQtdeTotal] = await conn.execute(
      `SELECT id FROM marketing_mailing_interacoes ${where}`,
      params
    );
    const qtdeTotal = (rowQtdeTotal && rowQtdeTotal.length) || 0;

    const limit = pagination ? " LIMIT ? OFFSET ? " : "";
    if (limit) {
      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);
    }
    const [interacoes] = await conn.execute(
      `SELECT * FROM marketing_mailing_interacoes ${where} ORDER BY created_at DESC ${limit}`,
      params
    );

    const objResponse = {
      rows: interacoes,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "GET_ALL_INTERACOES_MANUAIS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
