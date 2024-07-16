const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

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
    let whereTransacao = ` WHERE 1=1 `;
    let whereVencimentos = ` WHERE 1=1 `;
    let whereFaturas = ` WHERE 1=1 `;
    let whereVencimentosConciliados = ` WHERE 1=1 `;
    let whereFaturasConciliadas = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      whereTransacao += ` AND eb.id_conta_bancaria = ? `;
      whereVencimentos += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        whereTransacao += ` AND eb.data_transacao BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
        whereVencimentos += ` AND tv.data_prevista BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
        whereTituloConciliado += ` AND tv.data_pagamento BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          whereTransacao += ` AND eb.data_transacao = '${
            data_de.split("T")[0]
          }' `;
          whereVencimentos += ` AND tv.data_prevista = '${
            data_de.split("T")[0]
          }' `;
          whereTituloConciliado += ` AND tv.data_pagamento = '${
            data_de.split("T")[0]
          }' `;
        }
        if (data_ate) {
          whereTransacao += ` AND eb.data_transacao = '${
            data_ate.split("T")[0]
          }' `;
          whereVencimentos += ` AND tv.data_prevista = '${
            data_ate.split("T")[0]
          }' `;
          whereTituloConciliado += ` AND tv.data_pagamento = '${
            data_ate.split("T")[0]
          }' `;
        }
      }
    }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id_conta_bancaria || !range_data.to || !range_data.from) {
        resolve([]);
      }
      // * A Conciliar
      // ~ Vencimentos a conciliar
      const [rowsTitulosConciliar] = await conn.execute(
        `
        SELECT
            tv.id_titulo, tv.id as id_vencimento, tv.valor_pago as valor, t.descricao, t.num_doc,
            forn.nome as nome_fornecedor,
            f.nome as filial,
            tv.data_prevista as data_pagamento
        FROM fin_cp_titulos t
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id
  
        ${whereTitulo}
        AND tv.status = "pago"
        AND NOT b.data_pagamento IS NULL
        AND cbi.id IS NULL
        ORDER BY tv.data_prevista DESC
      `,
        params
      );
      // ~ Transações a conciliar
      const [rowsTransacoesConciliar] = await conn.execute(
        `
        SELECT
            eb.id, eb.id_transacao, eb.documento as doc,
            ABS(eb.valor) as valor, eb.data_transacao, eb.descricao
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_extrato = eb.id
  
        ${whereTransacao}
        AND tipo_transacao = 'DEBIT'
        AND cbi.id IS NULL
        ORDER BY id
      `,
        params
      );

      // * Itens conciliados
      // ~ Títulos conciliados
      const [rowsTitulosConciliados] = await conn.execute(
        `
          SELECT
            cbi.id_conciliacao,
            t.id as id_titulo, tv.id as id_vencimento, tv.valor_pago as valor, t.descricao, t.num_doc,
            forn.nome as nome_fornecedor,
            f.nome as filial,
            tv.data_prevista as data_pagamento
          FROM fin_cp_titulos t
          LEFT JOIN fin_cp_titulos_vencimentos tv ON t.id = tv.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id
          LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
          LEFT JOIN fin_cp_bordero b ON b.id = tb.id_bordero
  
          ${whereTituloConciliado}
          AND NOT cbi.id IS NULL
          ORDER BY tv.data_prevista DESC
        `,
        params
      );

      //~~ Transações conciliadas
      const [rowsTransacoesConciliadas] = await conn.execute(
        `
          SELECT
            eb.id, eb.id_transacao, eb.documento as doc,
            ABS(eb.valor) as valor, eb.data_transacao, eb.descricao,
            cbi.id_conciliacao
          FROM fin_extratos_bancarios eb
          LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_extrato = eb.id
  
          ${whereTransacao}
          AND tipo_transacao = 'DEBIT'
          AND NOT cbi.id IS NULL
          ORDER BY eb.data_transacao DESC
      `,
        params
      );

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
        titulosConciliados: rowsTitulosConciliados,
        titulosConciliar: rowsTitulosConciliar,
        transacoesConciliadas: rowsTransacoesConciliadas,
        transacoesConciliar: rowsTransacoesConciliar,
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
