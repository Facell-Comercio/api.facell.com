const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function getOne(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      const conn = await db.getConnection();
      try {
        const [rowBorderos] = await conn.execute(
          `
              SELECT 
                b.id, b.data_pagamento, b.id_conta_bancaria, 
                cb.descricao as conta_bancaria, f.id_matriz, fb.nome as banco
              FROM fin_cp_bordero b
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_bordero = b.id
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
              LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
              LEFT JOIN filiais f ON f.id = cb.id_filial
              LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
              WHERE b.id = ?
              `,
          [id]
        );
        const [rowTitulos] = await conn.execute(
          `
              SELECT 
                tv.id as id_vencimento,
                tv.id_titulo, 
                tv.valor as valor_total, 
                tv.valor_pago as valor_pago, 
                t.descricao, t.id_status, t.num_doc, t.id_forma_pagamento,
                tv.data_prevista as previsao, 
                tv.data_pagamento, 
                fp.forma_pagamento,
                tv.obs, tv.status, tv.tipo_baixa,
                f.nome as nome_fornecedor, 
                t.data_emissao, 
                tv.data_vencimento,
                c.nome as centro_custo,
                  b.id_conta_bancaria, 
                f.cnpj,
                fi.nome as filial, 
                dda.id as id_dda,
                CASE WHEN (tv.data_pagamento) THEN FALSE ELSE TRUE END as can_remove,
                CASE WHEN (tv.data_pagamento IS NOT NULL AND tb.remessa = 0 AND cbi.id_cp IS NULL) THEN TRUE ELSE FALSE END as can_modify,
                tb.remessa,
                false AS checked
              FROM fin_cp_bordero b
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_bordero = b.id
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_cp_titulos_rateio tr ON tr.id_titulo = tv.id_titulo
              LEFT JOIN fin_cp_status st ON st.id = t.id_status
              LEFT JOIN fin_fornecedores f ON f.id = t.id_fornecedor
              LEFT JOIN fin_contas_bancarias cb ON cb.id = b.id_conta_bancaria
              LEFT JOIN filiais fi ON fi.id = t.id_filial
              LEFT JOIN fin_centros_custo c ON c.id = tr.id_centro_custo
              LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
              LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
              LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_cp = tv.id
              WHERE b.id = ?
              GROUP BY tv.id
              `,
          [id]
        );
        const bordero = rowBorderos && rowBorderos[0];
  
        const objResponse = {
          ...bordero,
          vencimentos: rowTitulos,
        };
        resolve(objResponse);
        return;
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "GET_ONE",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        reject(error);
        return;
      } finally {
        conn.release();
      }
    });
  }