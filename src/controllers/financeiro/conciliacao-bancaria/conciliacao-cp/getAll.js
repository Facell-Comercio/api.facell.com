const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const {
  getAllFaturasBordero,
} = require("../../contas-a-pagar/cartoes-controller");
const {
  getAllVencimentosBordero,
} = require("../../contas-a-pagar/vencimentos-controller");
const { getAllTransacoesBancarias } = require("./getAllTransacoesBancarias");
const getChartConciliacaoPagamentos = require("./getChart");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters } = req.query;
    const { id_conta_bancaria } = filters || {};
    
    let conn;
    try {
      if (!id_conta_bancaria) {
        throw new Error('ID Conta bancária não recebido!')
      }
      conn = await db.getConnection();

      // * ChartConciliacaoPagamentos
      const dataChartConciliacaoPagamentos = await getChartConciliacaoPagamentos({query: req.query})

      // * Itens a Conciliar
      const { rows: vencimentosConciliar } = await getAllVencimentosBordero({
        query: {
          filters: { ...filters, tipo_data: "data_prevista" },
          emBordero: true,
          emConciliacao: false,
          pago: true,
          minStatusTitulo: 4,
          orderBy: "ORDER BY tv.data_prevista DESC",
        },
      });
      const { rows: faturasConciliar } = await getAllFaturasBordero({
        query: {
          filters: { ...filters, tipo_data: "data_prevista" },
          emBordero: true,
          emConciliacao: false,
          pago: true,
          minStatusTitulo: 4,
          orderBy: "ORDER BY ccf.data_prevista DESC",
        },
      });

      const itensConciliar = [
        ...vencimentosConciliar.map((v) => ({
          ...v,
          valor: v.valor_total,
          tipo: "vencimento",
        })),
        ...faturasConciliar.map((f) => ({
          ...f,
          valor: f.valor_total,
          tipo: "fatura",
        })),
      ];

      const { rows: transacoesConciliar } = await getAllTransacoesBancarias({
        query: {
          filters: { ...filters },
          emConciliacao: false,
          naoConciliaveis: false,
        },
      });

      // * Itens conciliados
      const { rows: vencimentosConciliados } = await getAllVencimentosBordero({
        query: {
          filters: { ...filters, tipo_data: "data_pagamento" },
          emBordero: true,
          emConciliacao: true,
          pago: true,
          minStatusTitulo: 4,
          orderBy: "ORDER BY tv.data_pagamento DESC",
        },
      });
      const { rows: faturasConciliados } = await getAllFaturasBordero({
        query: {
          filters: { ...filters, tipo_data: "data_pagamento" },
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
          valor: f.valor_total,
          tipo: "fatura",
        })),
      ];

      const { rows: transacoesConciliadas } = await getAllTransacoesBancarias({
        query: {
          filters: { ...filters },
          emConciliacao: true,
        },
      });

      const [rowsBancoComFornecedor] = await conn.execute(
        `
          SELECT cb.id
          FROM fin_contas_bancarias cb
          LEFT JOIN fin_bancos b ON b.id = cb.id_banco
          WHERE cb.id = ?
          AND b.id_fornecedor IS NOT NULL
          `,
        [id_conta_bancaria]
      );
      const bancoComFornecedor =
        rowsBancoComFornecedor && rowsBancoComFornecedor[0];

      const objResponse = {
        dataChartConciliacaoPagamentos,
        titulosConciliar: itensConciliar,
        titulosConciliados: itensConciliados,
        transacoesConciliar: transacoesConciliar,
        transacoesConciliadas: transacoesConciliadas,
        bancoComFornecedor: bancoComFornecedor,
      };
   
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
