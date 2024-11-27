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
    await conn.beginTransaction();
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
      "UPDATE comissao_vendas_invalidas_contestacoes SET status = ?, resposta = ?, id_user_resposta = ?, data_resposta = ? WHERE id = ?",
      [status, resposta, user.id, new Date(), id]
    );

    const [rowVendaInvalida] = await conn.execute(
      "SELECT id_venda_invalida as id FROM comissao_vendas_invalidas_contestacoes WHERE id = ?",
      [id]
    );
    const vendaInvalida = rowVendaInvalida && rowVendaInvalida[0];
    if (!vendaInvalida) {
      throw new Error("Venda não encontrada.");
    }

    await conn.execute("UPDATE comissao_vendas_invalidas SET status = ? WHERE id = ?", [
      status,
      vendaInvalida.id,
    ]);

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "UPDATE_STATUS_CONTESTACAO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
