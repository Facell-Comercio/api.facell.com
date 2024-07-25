const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const {
  getAllFaturasBordero,
} = require("../../contas-a-pagar/cartoes-controller");
const {
  getAllVencimentosBordero,
} = require("../../contas-a-pagar/vencimentos-controller");
const { getAllTransacoesBancarias } = require("./getAllTransacoesBancarias");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters } = req.query;
    const { id_conta_bancaria, range_data } = filters || {};

    // let whereTransacao = ` WHERE 1=1 `;
    // let whereVencimentos = ` WHERE 1=1 `;
    // let whereFaturas = ` WHERE 1=1 `;
    // let whereVencimentosConciliados = ` WHERE 1=1 `;
    // let whereFaturasConciliadas = ` WHERE 1=1 `;
    // const params = [];

    // if (id_conta_bancaria) {
    //   whereTransacao += ` AND eb.id_conta_bancaria = ? `;
    //   whereVencimentos += ` AND b.id_conta_bancaria = ? `;
    //   params.push(id_conta_bancaria);
    // }

    // if (range_data) {
    //   const { from: data_de, to: data_ate } = range_data;
    //   if (data_de && data_ate) {
    //     whereTransacao += ` AND eb.data_transacao BETWEEN '${
    //       data_de.split("T")[0]
    //     }' AND '${data_ate.split("T")[0]}'  `;
    //     whereVencimentos += ` AND tv.data_prevista BETWEEN '${
    //       data_de.split("T")[0]
    //     }' AND '${data_ate.split("T")[0]}'  `;
    //     whereTituloConciliado += ` AND tv.data_pagamento BETWEEN '${
    //       data_de.split("T")[0]
    //     }' AND '${data_ate.split("T")[0]}'  `;
    //   } else {
    //     if (data_de) {
    //       whereTransacao += ` AND eb.data_transacao = '${
    //         data_de.split("T")[0]
    //       }' `;
    //       whereVencimentos += ` AND tv.data_prevista = '${
    //         data_de.split("T")[0]
    //       }' `;
    //       whereTituloConciliado += ` AND tv.data_pagamento = '${
    //         data_de.split("T")[0]
    //       }' `;
    //     }
    //     if (data_ate) {
    //       whereTransacao += ` AND eb.data_transacao = '${
    //         data_ate.split("T")[0]
    //       }' `;
    //       whereVencimentos += ` AND tv.data_prevista = '${
    //         data_ate.split("T")[0]
    //       }' `;
    //       whereTituloConciliado += ` AND tv.data_pagamento = '${
    //         data_ate.split("T")[0]
    //       }' `;
    //     }
    //   }
    // }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id_conta_bancaria || !range_data.to || !range_data.from) {
        resolve([]);
      }

      // * A Conciliar
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
          valor: v.valor_total,
          tipo: "fatura",
        })),
      ];

      const { rows: transacoesConciliar } = await getAllTransacoesBancarias({
        query: {
          filters: { ...filters },
          emConciliacao: false,
          naoConciliaveis: false
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
          valor: v.valor_total,
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
