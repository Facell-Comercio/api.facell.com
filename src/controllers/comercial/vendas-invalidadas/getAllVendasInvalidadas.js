const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { pagination, filters } = req.query;
    const { mes, ano, status, tipo, segmento, motivo, termo } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    conn = conn_externa || (await db.getConnection());
    let where = " WHERE 1=1 ";
    const params = [];
    if (mes) {
      where += ` AND MONTH(ref) = ? `;
      params.push(mes);
    }
    if (ano) {
      where += ` AND YEAR(ref) = ? `;
      params.push(ano);
    }
    if (status) {
      where += ` AND status LIKE ? `;
      params.push(status);
    }
    if (tipo) {
      where += ` AND tipo LIKE ? `;
      params.push(tipo);
    }
    if (segmento) {
      where += ` AND segmento LIKE ? `;
      params.push(segmento);
    }
    if (motivo) {
      where += ` AND motivo LIKE CONCAT('%',?,'%') `;
      params.push(motivo);
    }
    if (termo) {
      where += `
        AND (
          pedido LIKE CONCAT('%',?,'%') OR
          gsm LIKE CONCAT('%',?,'%') OR
          cpf_cliente LIKE CONCAT('%',?,'%') OR
          imei LIKE CONCAT('%',?,'%')
        )
      `;
      params.push(termo, termo, termo, termo);
    }

    const [rowTotal] = await conn.execute(
      `SELECT COUNT(*) AS qtde
            FROM (
              SELECT
                fd.id
              FROM comissao_vendas_invalidas fd
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

    const [rows] = await conn.execute(
      `SELECT * FROM comissao_vendas_invalidas fd ${where} ${limit}`,
      params
    );
    const objResponse = {
      rows: rows,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "GET_ALL_VENDAS_INVALIDAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
