const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { formatDate } = require("date-fns");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, gsm, cpf, nome_assinante, data, operador, observacao } = req.body;
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    if (!id) {
      throw new Error("ID não informado");
    }
    if (!gsm) {
      throw new Error("GSM não informado");
    }
    if (!cpf) {
      throw new Error("CPF não informado");
    }
    if (!nome_assinante) {
      throw new Error("Nome do cliente não informado");
    }
    if (!data) {
      throw new Error("Data não informada");
    }
    if (!operador) {
      throw new Error("Operador não informado");
    }

    await conn.execute(
      `UPDATE marketing_mailing_interacoes SET
        gsm = ?,
        cpf = ?,
        nome_assinante = ?,
        data = ?,
        operador = ?,
        observacao = ?
        WHERE id = ?`,
      [gsm, cpf, nome_assinante, formatDate(data, "yyyy-MM-dd"), operador, observacao, id]
    );
    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "UPDATE_INTERACAO_MANUAL",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
