const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { ensureArray } = require("../../../../helpers/mask");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { id } = req.params || {};
      const { plano_atual_list, produto_list, produto_fidelizado, sem_contato, status_plano_list } =
        req.query.filters || {};

      let where = " WHERE 1=1 ";
      const params = [];

      if (plano_atual_list && plano_atual_list.length > 0) {
        where += ` AND mc.plano_atual IN('${ensureArray(plano_atual_list).join("','")}') `;
      }
      if (produto_list && produto_list.length > 0) {
        where += ` AND mc.produto_ultima_compra IN('${ensureArray(produto_list).join("','")}') `;
      }
      if (produto_fidelizado !== undefined && produto_fidelizado !== "all") {
        if (Number(produto_fidelizado)) {
          where += " AND mc.produto_fidelizado = 1 ";
        } else {
          where += " AND (mc.produto_fidelizado = 0 OR mc.produto_fidelizado IS NULL) ";
        }
      }
      if (sem_contato !== undefined && sem_contato !== "all") {
        if (Number(sem_contato)) {
          where += " AND mr.id IS NULL";
        } else {
          where += " AND mr.id IS NOT NULL";
        }
      }
      if (status_plano_list && status_plano_list.length > 0) {
        where += ` AND mc.status_plano IN('${ensureArray(status_plano_list).join("','")}') `;
      }
      if (id) {
        where += " AND mc.id_campanha =? ";
        params.push(id);
      }

      conn = conn_externa || (await db.getConnection());

      const [rowCampanha] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id = ?`,
        [id]
      );
      const campanha = rowCampanha && rowCampanha[0];

      if (!campanha) {
        throw new Error(`Campanha não encontrada`);
      }

      const [clientes] = await conn.execute(
        `
        SELECT mc.*, mr.id as id_resultado
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        ${where}`,
        params
      );

      //* DEFINIÇÃO DOS VALORES DO PRODUTO DE CADA CLIENTE
      for (const cliente of clientes) {
        if (!cliente.produto_ofertado) {
          continue;
        }
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

      //~ INÍCIO - FILTERS LIST
      //~ PLANO ATUAL
      const [plano_atual_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.plano_atual as value FROM marketing_mailing_clientes mc ${where}`,
        params
      );

      //~ PRODUTO ÚLTIMA COMPRA
      const [produto_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.produto_ultima_compra as value FROM marketing_mailing_clientes mc ${where}`,
        params
      );

      //~ STATUS PLANO
      const [status_plano_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.status_plano as value FROM marketing_mailing_clientes mc ${where}`,
        params
      );

      //~ STATUS PLANO
      const [vendedores_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.vendedor as value FROM marketing_mailing_clientes mc ${where}`,
        params
      );

      campanha.filters = {
        plano_atual_list: plano_atual_list_filters || [],
        produto_list: produto_list_filters || [],
        status_plano_list: status_plano_list_filters || [],
        vendedores_list: vendedores_list_filters || [],
      };
      //~ FIM - FILTERS LIST

      const [rowQtdeClientes] = await conn.execute(
        `
        SELECT COUNT(mc.id) as qtde
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        ${where}`,
        params
      );
      campanha.qtde_clientes =
        (rowQtdeClientes && rowQtdeClientes[0] && rowQtdeClientes[0].qtde) || 0;
      campanha.clientes = clientes;

      const [subcampanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?`,
        [id]
      );
      campanha.subcampanhas = subcampanhas;

      const idsCampanhas = [id, subcampanhas.map((subcampanha) => subcampanha.id)].flat();

      const [allClientes] = await conn.execute(
        `
        SELECT mc.*
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        WHERE mc.id_campanha IN ('${idsCampanhas.join("','")}')`
      );

      campanha.all_clientes = allClientes;

      resolve(campanha);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
