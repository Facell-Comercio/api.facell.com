const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/formaters");
const { hasPermission } = require("../../../../../helpers/hasPermission");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;
    const user = req.user;

    let conn;

    try {
      const { id } = req.params || {};
      const { filters, pagination } = req.body || {};
      const {
        plano_atual_list,
        produto_list,
        produto_fidelizado,
        status_plano_list,
        status_contato_list,
        uf_list,
        vendedores_list,
        isExportacao,
        planos_fidelizaveis,
        produto_nao_ofertado,
      } = filters || {};
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };

      let where = " WHERE 1=1 ";
      const params = [];

      const filiaisGestor = user.filiais
        .filter((filial) => filial.gestor)
        .map((filial) => filial.nome);

      if (!hasPermission(req, ["MASTER", "MAILING:VER_TUDO"])) {
        if (filiaisGestor.length > 0) {
          where += ` AND (mc.filial IN (${filiaisGestor
            .map((value) => db.escape(value))
            .join(",")}) OR mv.id_user = ?)`;
          params.push(user.id);
        } else {
          if (user.id) {
            where += ` AND mv.id_user = ? `;
            params.push(user.id);
          }
        }
      }

      if (plano_atual_list && ensureArray(plano_atual_list).length > 0) {
        where += ` AND mc.plano_atual IN(${ensureArray(plano_atual_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (produto_list && ensureArray(produto_list).length > 0) {
        where += ` AND mc.produto_ultima_compra IN(${ensureArray(produto_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (produto_fidelizado !== undefined && produto_fidelizado !== "all") {
        if (Number(produto_fidelizado)) {
          where += " AND mc.produto_fidelizado = 1 ";
        } else {
          where += " AND (mc.produto_fidelizado = 0 OR mc.produto_fidelizado IS NULL) ";
        }
      }
      if (produto_nao_ofertado !== undefined && produto_nao_ofertado !== "all") {
        if (Number(produto_nao_ofertado)) {
          where += " AND mc.produto_ofertado IS NULL ";
        } else {
          where += " AND mc.produto_ofertado IS NOT NULL ";
        }
      }
      if (status_contato_list && ensureArray(status_contato_list).length > 0) {
        where += ` AND (mr.status IN(${ensureArray(status_contato_list)
          .map((value) => db.escape(value))
          .join(",")})
          ${status_contato_list.includes("NULL") ? "OR mr.status IS NULL" : ""}
          )`;
      }
      if (uf_list && ensureArray(uf_list).length > 0) {
        where += ` AND mc.uf IN(${ensureArray(uf_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (vendedores_list && ensureArray(vendedores_list).length > 0) {
        where += ` AND mc.vendedor IN(${ensureArray(vendedores_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (isExportacao) {
        where += `AND NOT EXISTS(
          SELECT 1 FROM marketing_mailing_interacoes mrs
          WHERE mrs.id_cliente = mc.id
          AND mrs.status LIKE "CHAMADA ATENDIDA")
          `;
      }
      if (status_plano_list && ensureArray(status_plano_list).length > 0) {
        where += ` AND mc.status_plano IN(${ensureArray(status_plano_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }

      //& INÍCIO - CONDIÇÕES DE EXIBIÇÃO SOMENTE DE PLANOS FIDELIZÁVEIS
      // Excluir os planos não fidelizáveis – na coluna FRANQUIA (excluir todos os controles,
      // exceto smart e redes sociais ( esses são valido); excluir os Light (o cliente tem desconto
      // especial no plano, por isso não tem no aparelho); excluir todos os express. (cartão de credito);
      // fixos, live, empresarial, dependentes...
      // •	CONTROLES (EXCETO SMART E REDES SOCIAIS)
      // •	LIGHT
      // •	EXPRESS
      // •	FIXOS
      // •	LIVE
      // •	PÓS SOCIAL
      // •	TIM BLACK DEPENDENTE
      // •	PLANO TIM M2M 20MB
      // •	PLANO TIM COMMUNITY WEB
      // •	TIM MAIS C DEPENDENTE
      // •	PLANO TIM OFFICE

      if (planos_fidelizaveis !== undefined && planos_fidelizaveis !== "all") {
        if (planos_fidelizaveis === "1") {
          where += `
          AND NOT (
            (mc.plano_atual LIKE "%contro%" AND NOT mc.plano_atual LIKE "%controle smart%") OR
            (mc.plano_atual LIKE "%ctrl%" AND NOT mc.plano_atual LIKE "%ctrl redes%") OR
            mc.plano_atual LIKE "%light%" OR
            mc.plano_atual LIKE "%express%" OR
            mc.plano_atual LIKE "%fix%" OR
            mc.plano_atual LIKE "%live%" OR
            mc.plano_atual LIKE "%pos social%" OR
            mc.plano_atual LIKE "%depend%" OR
            mc.plano_atual LIKE "%m2m %" OR
            mc.plano_atual LIKE "%community%" OR
            mc.plano_atual LIKE "%office%" OR
            mc.plano_atual LIKE "%empresa%" OR
            mc.plano_atual LIKE "%torpedo%" OR
            mc.plano_atual IS NULL OR
            mc.plano_atual = ''
          )
        `;
        }
        if (planos_fidelizaveis === "0") {
          where += `
          AND (
            (mc.plano_atual LIKE "%contro%" AND NOT mc.plano_atual LIKE "%controle smart%") OR
            (mc.plano_atual LIKE "%ctrl%" AND NOT mc.plano_atual LIKE "%ctrl redes%") OR
            mc.plano_atual LIKE "%light%" OR
            mc.plano_atual LIKE "%express%" OR
            mc.plano_atual LIKE "%fix%" OR
            mc.plano_atual LIKE "%live%" OR
            mc.plano_atual LIKE "%pos social%" OR
            mc.plano_atual LIKE "%depend%" OR
            mc.plano_atual LIKE "%m2m %" OR
            mc.plano_atual LIKE "%community%" OR
            mc.plano_atual LIKE "%office%" OR
            mc.plano_atual LIKE "%empresa%" OR
            mc.plano_atual LIKE "%torpedo%" OR
            mc.plano_atual IS NULL OR
            mc.plano_atual = ''
          )
        `;
        }
      }

      //& FIM - CONDIÇÕES DE EXIBIÇÃO SOMENTE DE PLANOS FIDELIZÁVEIS

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
        // throw new Error(`Campanha não encontrada`);
        resolve();
      }

      //~ INÍCIO - FILTERS LIST
      //~ PLANO ATUAL
      const [plano_atual_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.plano_atual as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}
        ORDER BY mc.plano_atual ASC`,
        params
      );

      //~ PRODUTO ÚLTIMA COMPRA
      const [produto_list_filters] = await conn.execute(
        `SELECT CONCAT(mc.produto_ultima_compra, " (",COUNT(mc.id),")") as label,
        mc.produto_ultima_compra as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}
        GROUP BY mc.produto_ultima_compra
        ORDER BY mc.produto_ultima_compra ASC`,
        params
      );

      //~ STATUS PLANO
      const [status_plano_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.status_plano as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}
        ORDER BY mc.status_plano ASC`,
        params
      );

      //~ STATUS PLANO
      const [vendedores_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.vendedor as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}
        ORDER BY mc.vendedor ASC`,
        params
      );

      //~ STATUS CHAMADA
      const [status_contato_list_filters] = await conn.execute(
        `SELECT DISTINCT mr.status as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}`,
        params
      );

      //~ UFS
      const [uf_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.uf as value
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        ${where}`,
        params
      );

      campanha.filters = {
        plano_atual_list: plano_atual_list_filters.filter((item) => !!item.value) || [],
        produto_list: produto_list_filters.filter((item) => !!item.value) || [],
        status_plano_list: status_plano_list_filters.filter((item) => !!item.value) || [],
        vendedores_list: vendedores_list_filters.filter((item) => !!item.value) || [],
        status_contato_list: status_contato_list_filters,
        uf_list: uf_list_filters.filter((item) => !!item.value) || [],
      };

      //~ FIM - FILTERS LIST

      const [rowQtdeClientes] = await conn.execute(
        `
        SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT
              mc.id
            FROM marketing_mailing_clientes mc
            LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
            LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
            ${where}
          ) AS subconsulta
           `,
        params
      );

      campanha.qtde_clientes =
        (rowQtdeClientes && rowQtdeClientes[0] && rowQtdeClientes[0].qtde) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [clientes] = await conn.execute(
        `SELECT DISTINCT mc.* FROM marketing_mailing_clientes mc
          LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
          LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
          ${where} ORDER BY mc.cliente ${limit}`,
        params
      );

      const [rowsPrecos] = await conn.execute(
        `
          SELECT *
          FROM tim_tabela_precos
          WHERE data_final IS NULL
          GROUP BY descricao_comercial`
      );
      if (!rowsPrecos || rowsPrecos.length === 0) {
        throw new Error("Nenhum preço disponível para os produtos dos planos");
      }

      const [rowsPlanos] = await conn.execute("SELECT * FROM tim_planos_cbcf_vs_precos");
      if (!rowsPlanos || rowsPlanos.length === 0) {
        throw new Error("Nenhum plano encontrado");
      }

      //~ Cria um Map para os planos usando o nome como chave
      const planosMap = new Map();
      for (const plano of rowsPlanos) {
        const planoNome = String(plano.plano).toLowerCase().trim();
        planosMap.set(planoNome, plano);
      }

      //~ Cria um Map para os preços usando a descrição como chave
      const precosMap = new Map();
      for (const preco of rowsPrecos) {
        precosMap.set(preco.descricao_comercial, preco);
      }

      //* DEFINIÇÃO DOS VALORES DO PRODUTO DE CADA CLIENTE
      for (const cliente of clientes) {
        if (!cliente.plano_atual || !cliente.produto_ofertado) {
          continue;
        }

        // Busca o plano correspondente no Map
        const planoNome = cliente.plano_atual.trim().toLowerCase();
        const plano = planosMap.get(planoNome);

        let valor_plano_col = "val_pre";
        if (plano) {
          valor_plano_col = cliente.produto_fidelizado
            ? plano.produto_fidelizado
            : plano.produto_nao_fidelizado;
        }

        // Busca o preço correspondente no Map
        const precos = precosMap.get(cliente.produto_ofertado);

        // Atribui os valores ao cliente
        cliente.valor_pre = precos.val_pre || 0;
        cliente.valor_plano = precos[valor_plano_col] || 0;
        cliente.desconto = parseFloat(cliente.valor_pre) - parseFloat(cliente.valor_plano);
      }

      campanha.clientes = clientes;

      const [subcampanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?`,
        [id]
      );
      campanha.subcampanhas = subcampanhas;

      const idsCampanhas = [id, subcampanhas.map((subcampanha) => subcampanha.id)].flat();

      const [allClientes] = await conn.execute(
        `
        SELECT DISTINCT mc.*
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        WHERE mc.id_campanha IN (${idsCampanhas.map((value) => db.escape(value)).join(",")})`
      );

      campanha.all_clientes = allClientes;
      campanha.qtde_all_clientes = allClientes?.length || 0;

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
