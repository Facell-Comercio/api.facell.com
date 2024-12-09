const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/formaters");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { id } = req.params || {};

      const { filters } = req.body || {};
      const {
        plano_atual_list,
        produto_list,
        produto_fidelizado,
        status_plano_list,
        status_contato_list,
        uf_list,
        isExportacao,
        planos_fidelizaveis,
      } = filters || {};
      let where = " WHERE 1=1 ";
      const params = [];

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
      if (status_contato_list && ensureArray(status_contato_list).length > 0) {
        where += ` AND mr.status IN(${ensureArray(status_contato_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (uf_list && ensureArray(uf_list).length > 0) {
        where += ` AND mc.uf IN(${ensureArray(uf_list)
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
        throw new Error(`Campanha não encontrada`);
      }

      const [rowQtdeClientes] = await conn.execute(
        `
        SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT
              mc.id
            FROM marketing_mailing_clientes mc
            LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
            ${where}
          ) AS subconsulta
           `,
        params
      );

      campanha.qtde_clientes =
        (rowQtdeClientes && rowQtdeClientes[0] && rowQtdeClientes[0].qtde) || 0;

      const [clientes] = await conn.execute(
        `SELECT DISTINCT mc.id, mc.gsm FROM marketing_mailing_clientes mc
          LEFT JOIN marketing_mailing_interacoes mr ON mr.id_cliente = mc.id
          ${where} ORDER BY mc.cliente`,
        params
      );
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
        WHERE mc.id_campanha IN ('${idsCampanhas.map((value) => db.escape(value)).join(",")})`
      );

      campanha.all_clientes = allClientes;
      campanha.qtde_all_clientes = allClientes?.length || 0;

      resolve(campanha);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CAMPANHA_GSMS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
