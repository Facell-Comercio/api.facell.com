const { formatDate } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id_caixa, type } = req.query;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id_caixa) {
        throw new Error("Id do caixa é obrigatório");
      }
      if (!type) {
        throw new Error("Tipo de detalhe é obrigatório");
      }
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.id_filial, dc.data, f.id_grupo_economico, f.nome as filial
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        WHERE dc.id = ?
        `,
        [id_caixa]
      );
      const caixa = rowsCaixas && rowsCaixas[0];
      if (!caixa) {
        throw new Error("Caixa não encontrado");
      }

      const tiposMap = new Map(
        Object.entries({
          cartao: {
            table: "fin_vendas_cartao fvc",
            forma_pgto: "CARTÃO",
            datatabaseColumns: `fvc.valor_venda as valor, fvc.data_venda as data, fvc.forma_pgto as forma_pagamento,
                                fvc.bandeira, fvc.cod_autorizacao, fvc.nsu, fvc.canal_venda,
                                fvc.taxa, fvc.status, fvc.adquirente`,
            tableColumns: [
              {
                label: "valor",
                type: "number",
                format: "currency",
              },
              { label: "data", type: "date" },
              {
                label: "forma_pagamento",
                type: "string",
              },
              {
                label: "bandeira",
                type: "string",
              },
              {
                label: "cod_autorizacao",
                type: "string",
              },
              { label: "nsu", type: "string" },
              {
                label: "canal_venda",
                type: "string",
              },
              {
                label: "taxa",
                type: "number",
                format: "currency",
              },
              { label: "status", type: "string" },
              {
                label: "adquirente",
                type: "string",
              },
            ],
            where: "WHERE fvc.data_venda = ? AND fvc.id_filial = ? ",
            whereMovimento: "AND dci.forma_pagamento LIKE 'CARTÃO'",
            tipoAjuste: "valor_cartao",
          },
          recarga: {
            table: "fin_vendas_recarga fvr",
            forma_pgto: "RECARGA",
            datatabaseColumns: `fvr.valor, fvr.gsm, fvr.usuario, fvr.status`,
            tableColumns: [
              {
                label: "valor",
                type: "number",
                format: "currency",
              },
              { label: "gsm", type: "string" },
              {
                label: "usuario",
                type: "string",
              },
              { label: "status", type: "string" },
            ],
            where: "WHERE fvr.data = ? AND fvr.id_filial = ? ",
            whereMovimento: "AND dci.recarga",
          },
          pitzi: {
            table: "pitzi_vendas pv",
            forma_pgto: "SEGURO PITZI PROVI - CARTAO",
            datatabaseColumns: `pv.valor, pv.tipo_plano, pv.id_seguro, pv.cpf_cliente, pv.cancelada`,
            tableColumns: [
              {
                label: "valor",
                type: "number",
                format: "currency",
              },
              {
                label: "tipo_plano",
                type: "string",
              },
              {
                label: "id_seguro",
                type: "string",
              },
              {
                label: "cpf_cliente",
                type: "string",
                format: "cpf",
              },
              {
                label: "cancelada",
                type: "boolean",
              },
            ],
            where: "WHERE pv.data = ? AND pv.id_filial = ? ",
            whereMovimento: "AND dci.forma_pagamento LIKE CONCAT('%','PITZI','%')",
            tipoAjuste: "valor_pitzi",
          },
          pix: {
            table: "fin_vendas_pix fvp",
            forma_pgto: "PIX",
            datatabaseColumns: `fvp.valor, fvp.banco, fvp.devolucao, fvp.txid`,
            tableColumns: [
              {
                label: "valor",
                type: "number",
                format: "currency",
              },
              { label: "banco", type: "string" },
              {
                label: "devolucao",
                type: "boolean",
              },
              { label: "txid", type: "string" },
            ],
            where: "WHERE fvp.data_venda = ? AND fvp.id_filial = ? ",
            whereMovimento:
              "AND (dci.forma_pagamento LIKE 'PIX - TRANSFERENCIA' OR dci.forma_pagamento LIKE 'PIX')",
            tipoAjuste: "valor_pix",
          },
          tradein: {
            table: "renov_tradein rt",
            forma_pgto: "TRADEIN",
            datatabaseColumns: `rt.valor, rt.voucher, rt.status, rt.data_uso`,
            tableColumns: [
              {
                label: "valor",
                type: "number",
                format: "currency",
              },
              {
                label: "voucher",
                type: "string",
              },
              { label: "status", type: "string" },
              { label: "data_uso", type: "date" },
            ],
            where: "WHERE rt.data = ? AND rt.id_filial = ? ",
            whereMovimento: "AND dci.forma_pagamento LIKE 'TRADEIN'",
            tipoAjuste: "valor_tradein",
          },
          // crediario: rowsPagamentoBoletoItau,
        })
      );

      const [rowsDadosReais] = await conn.execute(
        `
        SELECT
          ${tiposMap.get(type).datatabaseColumns}
          FROM ${tiposMap.get(type).table}
          ${tiposMap.get(type).where}
      `,
        [caixa.data, caixa.id_filial]
      );

      let rowsMovimentoCaixa = [];
      if (type === "recarga") {
        if (!(caixa.id_grupo_economico == 1 || caixa.id_grupo_economico == 9)) {
          throw new Error("Este grupo econômico não pode realizar recargas!");
        }
        const tabela_recarga =
          caixa.id_grupo_economico == 1 ? "datasys_vendas" : "datasys_vendas_fort";
        [rowsMovimentoCaixa] = await conn.execute(
          `
          SELECT
            dv.dataPedido as data, dv.numeroPedido as documento,
            dv.tipoPedido as tipo_operacao, dv.descricao as historico, dv.valorCaixa as valor
          FROM ${tabela_recarga} dv
          WHERE dv.grupoEstoque = "RECARGA ELETRONICA"
          AND dv.tipoPedido = "Venda"
          AND DATE_FORMAT(dv.dataPedido,'%Y-%m-%d') = ?
          AND dv.filial = ?
          `,
          [formatDate(caixa.data, "yyyy-MM-dd"), caixa.filial]
        );
      } else {
        [rowsMovimentoCaixa] = await conn.execute(
          `
          SELECT
          dci.id, dci.data,dci.documento, dci.forma_pagamento,
          dci.tipo_operacao, dci.historico,dci.valor
          FROM datasys_caixas_itens dci
          WHERE dci.id_caixa = ?
          ${tiposMap.get(type).whereMovimento}
          `,
          [id_caixa]
        );
        const [rowsAjustes] = await conn.execute(
          `
          SELECT 
            id as documento, tipo_ajuste as tipo_operacao, obs as historico,
            CASE WHEN saida = '${
              tiposMap.get(type).tipoAjuste
            }' THEN valor * -1 ELSE valor * 1 END valor
          FROM datasys_caixas_ajustes
          WHERE id_caixa = ?
          AND (entrada = '${tiposMap.get(type).tipoAjuste}' OR saida = '${
            tiposMap.get(type).tipoAjuste
          }')
          AND aprovado
        `,
          [id_caixa]
        );
        rowsMovimentoCaixa.push(...rowsAjustes);
      }

      const obj = {
        movimento_caixa: rowsMovimentoCaixa,
        columns: tiposMap.get(type).tableColumns,
        dados_reais: rowsDadosReais,
      };

      resolve(obj);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_CARD_DETALHE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
