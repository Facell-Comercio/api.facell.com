const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros

  let conn;

  try {
    const { pagination, filters } = req.query;
    const { termo, active } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];
    let where = " WHERE 1=1 ";

    if (termo) {
      where += ` AND perfil LIKE CONCAT('%',?,'%') `;
      params.push(termo);
    }
    if (active !== undefined) {
      where += ` AND active =? `;
      params.push(active);
    }

    conn = await db.getConnection();

    const [rowTotal] = await conn.execute(
      `SELECT COUNT(*) AS qtde
            FROM (
              SELECT id FROM perfis
              ${where}
            ) 
            as subconsulta
            `,
      params
    );
    const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

    const limit = pagination ? " LIMIT ? OFFSET ? " : "";
    if (limit) {
      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);
    }

    const [rows] = await conn.execute(`SELECT * FROM perfis ${where} ${limit}`, params);
    const objResponse = {
      rows: rows,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "ADM",
      origin: "PERMISSOES",
      method: "GET_ALL",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
