const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function getConciliacoes(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    
    const { id_filial, range_data } = filters || {};
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_filial) {
      where += ` AND (fcbe.id_filial = ? OR t.id_filial = ?) `;
      params.push(id_filial);
      params.push(id_filial);
    }

    if (range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND cb.created_at BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND cb.created_at = '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND cb.created_at = '${data_ate.split("T")[0]}' `;
        }
      }
    }
    
      conn = await db.getConnection();

      const [rowsConciliacoes] = await conn.execute(
        `
          SELECT 
            count(cb.id) as total
          FROM fin_conciliacao_bancaria cb
          LEFT JOIN users u ON u.id = cb.id_user
          LEFT JOIN fin_conciliacao_bancaria_itens fcbi ON fcbi.id_conciliacao = cb.id
          LEFT JOIN fin_extratos_bancarios eb 
            ON eb.id = fcbi.id_item
            AND fcbi.tipo = 'transacao'
          LEFT JOIN fin_contas_bancarias fcbe ON fcbe.id = eb.id_conta_bancaria
          LEFT JOIN fin_cp_titulos_vencimentos tv 
            ON tv.id = fcbi.id_item
            AND fcbi.tipo = 'pagamento'
          LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
  
          ${where}
          AND cb.modulo = "CP"
          GROUP BY cb.id
      `,
        params
      );
      const totalConciliacoes =
        (rowsConciliacoes &&
          rowsConciliacoes.length > 0 &&
          rowsConciliacoes[0]["total"]) ||
        0;

      const offset = pageIndex * pageSize;

      params.push(pageSize);
      params.push(offset);

      const [conciliacoes] = await conn.execute(
        `
        SELECT 
          cb.id, u.nome as responsavel, cb.created_at as data_conciliacao, cb.tipo,
          (
            SELECT SUM(tv.valor_pago)
            FROM fin_cp_titulos_vencimentos tv
            INNER JOIN fin_conciliacao_bancaria_itens cbip 
              ON cbip.id_item = tv.id
              AND cbip.tipo = 'pagamento'
            WHERE cbip.id_conciliacao = cb.id
          ) as valor_pagamentos,
          ABS((
            SELECT SUM(eb.valor)
            FROM fin_extratos_bancarios eb
            INNER JOIN fin_conciliacao_bancaria_itens cbit 
              ON cbit.id_item = eb.id 
              AND cbit.tipo = 'transacao'
            WHERE cbit.id_conciliacao = cb.id
            AND cbit.tipo = "transacao"
            AND eb.tipo_transacao = "DEBIT"
          )) as valor_transacoes
        FROM fin_conciliacao_bancaria cb
        LEFT JOIN users u ON u.id = cb.id_user
        LEFT JOIN fin_conciliacao_bancaria_itens fcbi ON fcbi.id_conciliacao = cb.id
        LEFT JOIN fin_extratos_bancarios eb 
          ON eb.id = fcbi.id_item
          AND fcbi.tipo = 'transacao'
        LEFT JOIN fin_contas_bancarias fcbe ON fcbe.id = eb.id_conta_bancaria
        LEFT JOIN fin_cp_titulos_vencimentos tv 
          ON tv.id = fcbi.id_item
          AND fcbi.tipo = 'pagamento'
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo

        ${where}
        AND cb.modulo = "CP"
        GROUP BY cb.id
        ORDER BY cb.id DESC
        LIMIT ? OFFSET ?
      `,
        params
      );

      const objResponse = {
        rows: conciliacoes,
        pageCount: Math.ceil(totalConciliacoes / pageSize),
        rowCount: totalConciliacoes,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIÇÃO BANCÁRIA CP",
        method: "GET_CONCILIACOES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
