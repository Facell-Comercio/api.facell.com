const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
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
    const {
      id_conta_bancaria,
      banco,
      id_grupo_economico,
      fornecedor,
      id_titulo,
      id_vencimento,
      num_doc,
      tipo_data,
      range_data,
      id_matriz,
      termo,
    } = filters || {};
    // const { id_matriz, termo } = filters || {id_matriz: 1, termo: null}
    let where = ` WHERE 1=1 `;
    const params = [];

    if (id_conta_bancaria) {
      where += ` AND bordero.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
    }
    if (banco) {
      where += ` AND fb.nome LIKE CONCAT('%', ?, '%')`;
      params.push(banco);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ?`;
      params.push(id_grupo_economico);
    }
    if (id_matriz && id_matriz !== "all") {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (fornecedor) {
      where += ` AND ff.nome LIKE CONCAT('%',?, '%') `;
      params.push(fornecedor);
    }
    if (num_doc) {
      where += ` AND t.num_doc = ? `;
      params.push(num_doc);
    }
    if (id_titulo) {
      where += ` AND tv.id_titulo = ? `;
      params.push(id_titulo);
    }
    if (id_vencimento) {
      where += ` AND tv.id = ? `;
      params.push(id_vencimento);
    }
    if (termo) {
      where += ` AND (
                    bordero.id LIKE CONCAT(?,"%") OR
                    cb.descricao LIKE CONCAT("%",?,"%") OR
                    bordero.data_pagamento LIKE CONCAT("%",?,"%")
                  ) `;
      //? Realizar a normalização de data_pagamento?
      params.push(termo);
      params.push(termo);
      params.push(termo);
    }
    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND bordero.${tipo_data} BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND bordero.${tipo_data} = '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND bordero.${tipo_data} = '${data_ate.split("T")[0]}' `;
        }
      }
    }

    const offset = pageIndex * pageSize;
    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT
              bordero.id
            FROM fin_cp_bordero bordero
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_bordero = bordero.id
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = bi.id_vencimento
            LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
            LEFT JOIN fin_contas_bancarias cb ON cb.id = bordero.id_conta_bancaria
            LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
            LEFT JOIN filiais f ON f.id = t.id_filial
            ${where}
            GROUP BY bordero.id
  
          ) AS subconsulta
          `,
        params
      );

      const qtdeTotal =
        (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;
      params.push(pageSize);
      params.push(offset);

      const query = `
          SELECT
          bordero.id, 
          bordero.data_pagamento, 
          cb.descricao as conta_bancaria, 
          t.descricao, 
          f.id_matriz,

          -- Calcular qtde_pendente, qtde_erro, qtde_programado, qtde_pago em uma única subconsulta
          COUNT(CASE 
                  WHEN tv.status = 'pendente' OR cf.status = 'pendente' THEN 1 
                END) AS qtde_pendente,

          COUNT(CASE 
                  WHEN tv.status = 'erro' OR cf.status = 'erro' THEN 1 
                END) AS qtde_erro,

          COUNT(CASE 
                  WHEN tv.status = 'programado' OR cf.status = 'programado' THEN 1 
                END) AS qtde_programado,

          COUNT(CASE 
                  WHEN tv.status = 'pago' OR cf.status = 'pago' THEN 1 
                END) AS qtde_pago,

          -- Calcular qtde_total
          COALESCE(COUNT(tv.id),0) + COALESCE(COUNT(cf.id),0) AS qtde_total,

          -- Calcular valor_total
          COALESCE(SUM(tv.valor),0) + COALESCE(SUM(cf.valor), 0) AS valor_total

        FROM fin_cp_bordero bordero
        LEFT JOIN fin_cp_bordero_itens bi ON bi.id_bordero = bordero.id
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = bi.id_vencimento
        LEFT JOIN fin_cartoes_corporativos_faturas cf ON cf.id = bi.id_fatura
        LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores ff ON ff.id = t.id_fornecedor
        LEFT JOIN fin_contas_bancarias cb ON cb.id = bordero.id_conta_bancaria
        LEFT JOIN fin_bancos fb ON fb.id = cb.id_banco
        LEFT JOIN filiais f ON f.id = t.id_filial

        ${where}
        GROUP BY bordero.id
        ORDER BY data_pagamento DESC
        LIMIT ? OFFSET ?
        `;

      const [rows] = await conn.execute(query, params);

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
