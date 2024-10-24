const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
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

      const [resultados] = await conn.execute(
        "SELECT *, TIMESTAMP(data_contato, hora_contato) as datetime_contato FROM marketing_mailing_resultados WHERE id_cliente =?",
        [id]
      );

      cliente.resultados = resultados;

      resolve(cliente);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CLIENTE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
