const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  const { id } = req.params || {};

  let conn;

  try {
    conn = conn_externa || (await db.getConnection());

    const [rowCliente] = await conn.execute(
      `SELECT * FROM marketing_mailing_clientes WHERE id = ?`,
      [id]
    );
    const cliente = rowCliente && rowCliente[0];
    if (cliente.produto_ofertado) {
      const [rowPlano] = await conn.execute(
        "SELECT * FROM tim_planos_cbcf_vs_precos WHERE plano LIKE ? LIMIT 1",
        [cliente.plano_atual && cliente.plano_atual.replace(".", " ")]
      );
      const plano = rowPlano && rowPlano[0];
      let valor_plano_col = "val_pre";
      if (plano) {
        valor_plano_col = cliente.produto_fidelizado
          ? plano.produto_fidelizado
          : plano.produto_nao_fidelizado;
      }
      const [rowPreco] = await conn.execute(
        `
          SELECT tp.${valor_plano_col} as valor_plano, val_pre as valor_pre
          FROM tim_tabela_precos tp
          WHERE tp.descricao_comercial = ? LIMIT 1`,
        [cliente.produto_ofertado]
      );
      const preco = rowPreco && rowPreco[0];

      cliente.valor_pre = preco?.valor_pre || 0;
      cliente.valor_plano = preco?.valor_plano || preco?.valor_pre || 0;
      cliente.desconto = parseFloat(cliente.valor_pre) - parseFloat(cliente.valor_plano);
    }

    const [interacoes] = await conn.execute(
      `
      SELECT *,
      TIMESTAMP(data, hora_contato_inicio) as datetime_contato_inicio,
      TIMESTAMP(data, hora_contato_resposta) as datetime_contato_resposta,
      TIMESTAMP(data, hora_contato_final) as datetime_contato_final
      FROM marketing_mailing_interacoes
      WHERE id_cliente =?`,
      [id]
    );

    cliente.interacoes = interacoes;

    res.status(200).json(cliente);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "GET_ONE_CLIENTE_CAMPANHA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
