const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());

    const [rowContestacao] = await conn.execute(
      `
      SELECT cc.*, u.nome as user, ur.nome as user_resposta
      FROM comissao_contestacoes cc
      LEFT JOIN users u ON u.id = cc.id_user
      LEFT JOIN users ur ON ur.id = cc.id_user_resposta
      WHERE cc.id = ?`,
      [id]
    );
    const contestacao = rowContestacao && rowContestacao[0];
    if (!contestacao) {
      throw new Error("Contestacao não encontrada!");
    }
    res.status(200).json(contestacao);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ONE_CONTESTACAO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
