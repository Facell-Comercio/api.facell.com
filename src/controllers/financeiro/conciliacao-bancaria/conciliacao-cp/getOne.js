const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { getAllFaturasBordero } = require("../../contas-a-pagar/cartoes-controller");
const { getAllVencimentosBordero } = require("../../contas-a-pagar/vencimentos-controller");
const { getAllTransacoesBancarias } = require("./getAllTransacoesBancarias");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      const [rowConciliacao] = await conn.execute(
        `
          SELECT 
            u.nome as responsavel, cb.created_at as data_conciliacao, cb.tipo
          FROM fin_conciliacao_bancaria cb
          LEFT JOIN users u ON u.id = cb.id_user
          WHERE cb.id = ?
        `,
        [id]
      );
      const conciliacao = rowConciliacao && rowConciliacao[0];
      if (!conciliacao) {
        throw new Error("Conciliação não encontrada!");
      }
      // const [rowVencimentos] = await conn.execute(
      //   `
      //       SELECT
      //         tv.id as id_vencimento, tv.id_titulo, tv.valor_pago, tv.tipo_baixa,
      //         t.descricao, forn.nome as nome_fornecedor,
      //         f.nome as filial,
      //         tv.data_prevista as data_pagamento
      //       FROM fin_cp_titulos t
      //       LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
      //       LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
      //       LEFT JOIN filiais f ON f.id = t.id_filial
      //       LEFT JOIN fin_conciliacao_bancaria_itens cbi
      //         ON cbi.id_item = tv.id
      //         AND cbi.tipo = 'transacao'
      //       WHERE cbi.id_conciliacao = ?
      //         `,
      //   [id]
      // );
      // const [rowTransacoes] = await conn.execute(
      //   `
      //       SELECT
      //         eb.id_transacao, eb.valor, eb.descricao, eb.tipo_transacao,
      //         eb.documento as doc, eb.data_transacao, cb.descricao as conta_bancaria
      //       FROM fin_extratos_bancarios eb
      //       LEFT JOIN fin_conciliacao_bancaria_itens cbi
      //         ON cbi.id_item = eb.id
      //         AND cbi.tipo = 'transacao'
      //       LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
      //       WHERE cbi.id_conciliacao = ?
      //         `,
      //   [id]
      // );

      const { rows: vencimentosConciliados } = await getAllVencimentosBordero({
        query: {
          filters: { id_conciliacao: id },
          emBordero: true,
          emConciliacao: true,
          pago: true,
          minStatusTitulo: 4,
          orderBy: "ORDER BY tv.data_pagamento DESC",
        },
      });
      const { rows: faturasConciliados } = await getAllFaturasBordero({
        query: {
          filters: { id_conciliacao: id },
          emBordero: true,
          emConciliacao: true,
          pago: true,
          minStatusTitulo: 4,
          orderBy: "ORDER BY ccf.data_pagamento DESC",
        },
      });

      const itensConciliados = [
        ...vencimentosConciliados.map((v) => ({
          ...v,
          valor: v.valor_total,
          tipo: "vencimento",
        })),
        ...faturasConciliados.map((f) => ({
          ...f,
          valor: v.valor_total,
          tipo: "fatura",
        })),
      ];

      const { rows: transacoesConciliadas } = await getAllTransacoesBancarias({
        query: {
          filters: { id_conciliacao: id },
          emConciliacao: true,
        },
      });

      const objResponse = {
        id,
        data_conciliacao: conciliacao.data_conciliacao,
        tipo: conciliacao.tipo,
        responsavel: conciliacao.responsavel,
        vencimentos: itensConciliados,
        transacoes: transacoesConciliadas,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CP",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
