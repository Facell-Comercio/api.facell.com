const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { getAllFaturasBordero } = require("../../contas-a-pagar/cartoes-controller");
const { getAllVencimentosBordero } = require("../../contas-a-pagar/vencimentos-controller");
const {
  getAllRecebimentos,
} = require("../../contas-a-receber/recebimentos/recebimentos-controller");
const getAllTransacoesBancariasCR = require("./getAllTransacoesBancariasCR");
const getChartConciliacaoPagamentos = require("./getChart");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters } = req.query;
    const { id_conta_bancaria } = filters || {};

    let conn;
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID Conta bancária não recebido!");
      }
      conn = await db.getConnection();

      // * ChartConciliacaoPagamentos
      const dataChartConciliacaoRecebimentos = await getChartConciliacaoPagamentos({
        query: req.query,
      });

      // * Itens a Conciliar
      const { rows: recebimentosConciliar } = await getAllRecebimentos({
        query: {
          filters,
          emConciliacao: false,
          pago: true,
          minStatusTitulo: 40,
        },
      });

      const { rows: transacoesConciliar } = await getAllTransacoesBancariasCR({
        query: {
          filters: { ...filters },
          emConciliacao: false,
          naoConciliaveis: false,
        },
      });

      // * Itens conciliados
      const { rows: recebimentosConciliados } = await getAllRecebimentos({
        query: {
          filters,
          emConciliacao: true,
          pago: true,
          minStatusTitulo: 40,
        },
      });
      const { rows: transacoesConciliadas } = await getAllTransacoesBancariasCR({
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
      const bancoComFornecedor = rowsBancoComFornecedor && rowsBancoComFornecedor[0];

      const objResponse = {
        dataChartConciliacaoRecebimentos,
        recebimentosConciliar: recebimentosConciliar,
        recebimentosConciliados: recebimentosConciliados,
        transacoesConciliar: transacoesConciliar,
        transacoesConciliadas: transacoesConciliadas,
        bancoComFornecedor: bancoComFornecedor,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
