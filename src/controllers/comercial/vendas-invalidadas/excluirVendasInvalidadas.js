const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { mes, ano } = req.query;

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

    await conn.execute(`DELETE FROM comissao_vendas_invalidas ${where}`, params);

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "EXCLUIR_VENDAS_INVALIDAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
