const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { normalizeNumberFixed } = require("../../../helpers/mask");
const { ensureArray } = require("../../../helpers/formaters");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { status, filters } = req.body;
    const { mes, ano, status_list, tipo_list, segmento_list, motivo, termo } = filters || {};

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
    if (ensureArray(status_list) && ensureArray(status_list).length) {
      where += ` AND status IN(${ensureArray(status_list)
        .map((value) => db.escape(value))
        .join(",")}) `;
    }
    if (ensureArray(tipo_list) && ensureArray(tipo_list).length) {
      where += ` AND tipo IN(${ensureArray(tipo_list)
        .map((value) => db.escape(value))
        .join(",")}) `;
    }
    if (ensureArray(segmento_list) && ensureArray(segmento_list).length) {
      where += ` AND segmento IN(${ensureArray(segmento_list)
        .map((value) => db.escape(value))
        .join(",")})`;
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

    await conn.execute(`UPDATE comissao_vendas_invalidas SET status = ? ${where}`, [
      status,
      ...params,
    ]);
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "UPDATE_RATEIO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    let message = String(error.message);
    if (message.toUpperCase().includes("DUPLICATE ENTRY")) {
      message = "Rateio duplicado! Colaborador já usado em outro rateio nesta venda!";
    }
    res.status(500).json({ message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
