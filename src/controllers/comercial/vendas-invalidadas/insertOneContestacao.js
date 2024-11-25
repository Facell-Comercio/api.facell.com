const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, contestacao, id_venda_invalida } = req.body;
    const user = req.user;
    conn = conn_externa || (await db.getConnection());
    if (id) {
      throw new Error(
        "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
      );
    }
    if (!contestacao) {
      throw new Error("É necessário informar a contestação!");
    }
    if (!id_venda_invalida) {
      throw new Error("É necessário informar o ID da venda!");
    }

    await conn.execute(
      "INSERT INTO comissao_vendas_invalidas_contestacoes (id_venda_invalida, contestacao,id_user) VALUES (?,?,?)",
      [id_venda_invalida, contestacao, user.id]
    );
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "INSERT_ONE_CONTESTACAO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
