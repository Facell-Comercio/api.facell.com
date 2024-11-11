const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function getAllFaturasBordero(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();

      const {
        pagination,
        filters,
        emBordero,
        emConciliacao,
        pago,
        id_bordero,
        minStatusTitulo,
        enabledStatusPgto,
        closedFatura,
        orderBy,
      } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const {
        id_matriz,
        id_filial,
        id_conta_bancaria,
        id_conciliacao,
        id_vencimento,
        id_titulo,
        fornecedor,
        descricao,
        dda,
        tipo_data,
        range_data,
      } = filters || {};

      let where = ` WHERE 1=1 `;
      let order = orderBy || " ORDER BY ccf.data_prevista ASC ";
      const params = [];

      if (id_vencimento) {
        where += ` AND ccf.id = ? `;
        params.push(id_vencimento);
      }
      if (id_bordero !== undefined) {
        where += ` AND  bi.id_bordero = ?`;
        params.push(id_bordero);
      }
      if (id_titulo) {
        where += ` AND tv.id_titulo = ? `;
        params.push(id_titulo);
      }
      if (descricao) {
        where += ` AND fcc.descricao LIKE CONCAT('%',?,'%')  `;
        params.push(descricao);
      }
      if (id_matriz) {
        where += ` AND fcc.id_matriz = ? `;
        params.push(id_matriz);
      }
      if (id_filial) {
        where += ` AND f.id = ? `;
        params.push(id_filial);
      }
      if (id_conta_bancaria) {
        where += ` AND b.id_conta_bancaria = ? `;
        params.push(id_conta_bancaria);
      }
      if (id_conciliacao) {
        where += ` AND cbi.id_conciliacao = ? `;
        params.push(id_conciliacao);
      }
      if (fornecedor) {
        where += ` AND forn.nome LIKE CONCAT('%',?,'%') `;
        params.push(fornecedor);
      }
      if (dda !== undefined) {
        if (dda == "true") {
          where += ` AND dda.id IS NOT NULL `;
        }
        if (dda == "false") {
          where += ` AND dda.id IS NULL `;
        }
      }
      if (closedFatura !== undefined) {
        if (closedFatura) {
          where += ` AND ccf.closed = 1 `;
        } else {
          where += ` AND ccf.closed = 0 `;
        }
      }

      // Determina o retorno com base se está ou não em borderô
      if (emBordero !== undefined) {
        if (emBordero) {
          where += ` AND bi.id_fatura IS NOT NULL`;
        } else {
          where += ` AND bi.id_fatura IS NULL`;
        }
      }

      // Determina o retorno com base se está ou não em conciliação
      if (emConciliacao !== undefined) {
        if (emConciliacao) {
          where += ` AND cbi.id IS NOT NULL`;
        } else {
          where += ` AND cbi.id IS NULL`;
        }
      }

      // Determina o retorno com base se está pago ou não
      if (pago !== undefined) {
        if (pago) {
          where += ` AND ccf.data_pagamento IS NOT NULL`;
        } else {
          where += ` AND ccf.data_pagamento IS NULL`;
        }
      }

      // Filtra o status mínimo do título
      if (minStatusTitulo !== undefined) {
        where += ` AND t.id_status >= ? `;
        params.push(minStatusTitulo);
      }

      // Filtra com base no status de pagamento
      if (enabledStatusPgto !== undefined && enabledStatusPgto.length > 0) {
        where += ` AND ccf.status IN ('${enabledStatusPgto.join("','")}')`;
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          where += ` AND ccf.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND ccf.${tipo_data} >= '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND ccf.${tipo_data} <= '${data_ate.split("T")[0]}' `;
          }
        }
      }

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT 
              ccf.id
            FROM fin_cartoes_corporativos_faturas ccf
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_fatura = ccf.id
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
            LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
            LEFT JOIN filiais f ON f.id = fcc.id_matriz
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_fatura = ccf.id
            LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
            LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id
            LEFT JOIN fin_conciliacao_bancaria_itens cbi 
              ON cbi.id_item = ccf.id
              AND cbi.tipo = 'fatura'
          ${where} 
          ) AS subconsulta
          `,
        params
      );

      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
      params.push(pageSize);
      params.push(offset);

      const [rows] = await conn.execute(
        `SELECT DISTINCT
            ccf.id,
            ccf.id as id_titulo,
            ccf.id as id_vencimento,
            ccf.status,
            ccf.data_prevista as previsao,
            ccf.data_vencimento,
            NULL as id_status,
            UPPER(fcc.descricao) as descricao,
            ccf.valor as valor_total,
            ccf.valor_pago,
            ccf.tipo_baixa,
            ccf.data_pagamento,
            ccf.obs,
            f.nome as filial,
            fcc.id_matriz,
            forn.nome as nome_fornecedor,
            "-" as num_doc,
            "Cartão" as forma_pagamento,
            6 as id_forma_pagamento,
            bi.remessa,
            cbi.id as conciliado,
            cbi.id_conciliacao as id_conciliacao,
            dda.id as id_dda
          FROM fin_cartoes_corporativos_faturas ccf
          LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_fatura = ccf.id
          LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
          LEFT JOIN filiais f ON f.id = fcc.id_matriz
          LEFT JOIN fin_cp_bordero_itens bi ON bi.id_fatura = ccf.id
          LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
          LEFT JOIN fin_dda dda ON dda.id_fatura = ccf.id
          LEFT JOIN fin_conciliacao_bancaria_itens cbi 
            ON cbi.id_item = ccf.id
            AND cbi.tipo = 'fatura'
          ${where} 
          ${order}
          LIMIT ? OFFSET ?
          `,
        params
      );

      const objResponse = {
        rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_ALL_FATURAS_BORDERO",
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
