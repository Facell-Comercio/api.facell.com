const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, status, resposta } = req.body;
    const user = req.user;
    conn = conn_externa || (await db.getConnection());
    if (!id) {
      throw new Error("ID da contestação é obrigatório");
    }
    if (!status) {
      throw new Error("Status da contestação é obrigatório");
    }
    if (!resposta) {
      throw new Error("Resposta da contestação é obrigatório");
    }

    await conn.execute(
      "UPDATE comissao_contestacoes SET status = ?, resposta = ?, id_user_resposta = ? WHERE id = ?",
      [status, resposta, user.id, id]
    );
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "UPDATE_STATUS_CONTESTACAO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
