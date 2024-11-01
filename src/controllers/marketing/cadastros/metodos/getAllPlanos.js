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
    const { termo, planoProdutoFidelizado, planoProdutoNaoFidelizado } = filters || {};

    let where = "WHERE 1=1";
    const params = [];

    if (termo) {
      where += " AND plano LIKE CONCAT('%',?, '%')";
      params.push(termo);
    }

    conn = conn_externa || (await db.getConnection());

    const [rowQtdeTotal] = await conn.execute(
      `SELECT id FROM tim_planos_cbcf_vs_precos ${where}`,
      params
    );
    const qtdeTotal = (rowQtdeTotal && rowQtdeTotal.length) || 0;

    const limit = pagination ? " LIMIT ? OFFSET ? " : "";
    if (limit) {
      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);
    }
    const [planos] = await conn.execute(
      `SELECT * FROM tim_planos_cbcf_vs_precos ${where} ${limit}`,
      params
    );

    const [plano_produto_nao_fidelizado] = await conn.execute(
      `SELECT DISTINCT produto_nao_fidelizado
      FROM tim_planos_cbcf_vs_precos
      WHERE 1=1 ${
        planoProdutoNaoFidelizado
          ? `AND produto_nao_fidelizado as value LIKE CONCAT('%',?, '%')`
          : ""
      }`,
      [planoProdutoNaoFidelizado || null]
    );

    const [plano_produto_fidelizado] = await conn.execute(
      `SELECT DISTINCT produto_fidelizado
      FROM tim_planos_cbcf_vs_precos
      WHERE 1=1 ${
        planoProdutoFidelizado ? `AND produto_fidelizado as value LIKE CONCAT('%',?, '%')` : ""
      }`,
      [planoProdutoFidelizado || null]
    );

    const objResponse = {
      rows: planos,
      plano_produto_fidelizado,
      plano_produto_nao_fidelizado,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "GET_ALL_PLANOS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
