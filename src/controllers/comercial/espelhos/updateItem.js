const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const updateTotalItem = require("./updateTotalItem");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, id_comissao, tipo, segmento, descricao, meta, realizado, atingimento, valor } =
      req.body;
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    if (!id) {
      throw new Error("É necessário informar o ID do item!");
    }
    if (!tipo) {
      throw new Error("É necessário informar o tipo do item!");
    }
    if (!id_comissao) {
      throw new Error("É necessário informar o ID da comissao!");
    }
    if (!segmento) {
      throw new Error("É necessário informar o segmento do item!");
    }
    if (!descricao) {
      throw new Error("É necessário informar a descrição do item!");
    }

    await updateTotalItem({
      conn_externa: conn,
      tipo,
      valor,
      id_item: id,
      id_comissao,
    });

    await conn.execute(
      "UPDATE comissao_itens SET segmento = ?, descricao = ?, meta = ?, realizado = ?, atingimento = ?, valor = ? WHERE id = ?",
      [
        String(segmento).toUpperCase(),
        String(descricao).toUpperCase(),
        meta,
        realizado,
        atingimento / 100,
        valor,
        id,
      ]
    );

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "UPDATE_ITEM",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
