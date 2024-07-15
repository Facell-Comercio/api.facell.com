const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { logger } = require("../../../../logger");

//! Remanejar para Borderô
function getAllCpVencimentosBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    var where = ` WHERE 1=1 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    const {
      id_vencimento,
      id_titulo,
      id_grupo_economico,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      id_filial,
      id_conta_bancaria,
      dda,
      termo,
    } = filters || {};

    const params = [];
    if (termo) {
      where += ` AND (
        t.id LIKE CONCAT(?,'%') 
        OR t.descricao LIKE CONCAT('%',?,'%')
        OR forn.nome LIKE CONCAT('%',?,'%')
        OR t.num_doc LIKE CONCAT('%',?,'%')
        OR t.valor LIKE CONCAT('%',?,'%')
        OR f.nome LIKE CONCAT('%',?,'%')  
    )  `;
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
    }
    if (id_vencimento) {
      where += ` AND tv.id = ? `;
      params.push(id_vencimento);
    }

    if (id_titulo) {
      where += ` AND tv.id_titulo = ? `;
      params.push(id_titulo);
    }

    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%')  `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
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

    where += ` 
    AND (t.id_status = 3 OR t.id_status = 4) 
    AND tb.id_vencimento IS NULL `;

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND tv.${tipo_data} BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND tv.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND tv.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT 
          tv.id 
          FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id

          ${where}
        ) AS subconsulta
        `,
        params
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT DISTINCT 
                t.id as id_titulo, t.id_status, UPPER(t.descricao) as descricao,
                tv.id as id_vencimento, tv.status, tv.data_prevista as previsao, 
                tv.valor as valor_total, tv.data_vencimento as data_pagamento,
                f.nome as filial, f.id_matriz,
                forn.nome as nome_fornecedor, t.num_doc, 
                fp.forma_pagamento
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
            LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            
            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      // console.log(query);
      // console.log(params);
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_VENCIMENTOS_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

//! Remanejar para Borderô
function getAllCpItemsBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    let where = ` WHERE 1=1 `;
    
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    const {
      id_vencimento,
      id_titulo,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      id_filial,
      dda,
    } = filters || {};

    const params = [];

    //* Início - Filtros Vencimentos
    if (id_vencimento) {
      where += ` AND tv.id = ? `;
      params.push(id_vencimento);
    }

    if (id_titulo) {
      where += ` AND tv.id_titulo = ? `;
      params.push(id_titulo);
    }

    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%')  `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (id_filial) {
      where += ` AND f.id = ? `;
      params.push(id_filial);
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

    where += ` 
    AND (t.id_status = 3 OR t.id_status = 4) 
    AND tb.id_vencimento IS NULL `;

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND tv.${tipo_data} BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND tv.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND tv.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    //* Fim - Filtros Vencimentos

   

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
        SELECT DISTINCT 
          t.id as id_titulo, 
          tv.id as id_vencimento,
          tv.status, 
          tv.data_prevista as previsao, 
          t.id_status, 
          UPPER(t.descricao) as descricao,
          tv.valor as valor_total, 
          tv.data_vencimento as data_pagamento,
          f.nome as filial, 
          f.id_matriz,
          forn.nome as nome_fornecedor, 
          t.num_doc, 
          fp.forma_pagamento
        FROM fin_cp_titulos t 
        LEFT JOIN fin_cp_status s ON s.id = t.id_status 
        LEFT JOIN filiais f ON f.id = t.id_filial 
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN users u ON u.id = t.id_solicitante
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
        LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
        ${where}

        UNION ALL

        SELECT DISTINCT 
          ccf.id as id_titulo, 
          ccf.id as id_vencimento, 
          ccf.status, 
          ccf.data_prevista as previsao,
          NULL as id_status, 
          UPPER(fcc.descricao) as descricao,
          ccf.valor as valor_total, 
          ccf.data_vencimento as data_pagamento,
          f.nome as filial, 
          fcc.id_matriz,
          forn.nome as nome_fornecedor,
          "-" as num_doc,  
          6 as forma_pagamento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
        LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
        LEFT JOIN filiais f ON f.id = fcc.id_matriz
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id

        ${whereFatura} 
        AND ccf.closed
        ) AS subconsulta
        `,
        params
      );

      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      params.push(pageSize);
      params.push(offset);

      const [rows] = await conn.execute(
        `
        SELECT * FROM (
        SELECT DISTINCT 
          t.id as id_titulo, 
          tv.id as id_vencimento,
          tv.status, 
          tv.data_prevista as previsao, 
          t.id_status, 
          UPPER(t.descricao) as descricao,
          tv.valor as valor_total, 
          tv.data_vencimento as data_pagamento,
          f.nome as filial, 
          f.id_matriz,
          forn.nome as nome_fornecedor, 
          t.num_doc, 
          fp.forma_pagamento,
          t.id_forma_pagamento
        FROM fin_cp_titulos t 
        LEFT JOIN fin_cp_status s ON s.id = t.id_status 
        LEFT JOIN filiais f ON f.id = t.id_filial 
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN users u ON u.id = t.id_solicitante
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
        LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
        LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
        ${where}

        UNION ALL

        SELECT DISTINCT 
          ccf.id as id_titulo, 
          ccf.id as id_vencimento, 
          ccf.status, 
          ccf.data_prevista as previsao,
          NULL as id_status, 
          UPPER(fcc.descricao) as descricao,
          ccf.valor as valor_total, 
          ccf.data_vencimento as data_pagamento,
          f.nome as filial, 
          fcc.id_matriz,
          forn.nome as nome_fornecedor,
          "-" as num_doc,  
          "Cartão" as forma_pagamento,
          6 as id_forma_pagamento
        FROM fin_cartoes_corporativos_faturas ccf
        LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
        LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
        LEFT JOIN filiais f ON f.id = fcc.id_matriz
        LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura  = ccf.id

        ${whereFatura} 
        AND ccf.closed = 1
        ) AS combined_results

        LIMIT ? OFFSET ?
        `,
        params
      );

      const objResponse = {
        rows,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_VENCIMENTOS_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll: require("./titulo-pagar/getAll"),
  getOne: require("./titulo-pagar/getOne"),
  getOneByTimParams: require("./titulo-pagar/getOneByTimParams"),
  getPendencias: require("./titulo-pagar/getPendencias"),
  insertOne: require("./titulo-pagar/insertOne"),
  insertOneByGN: require("./titulo-pagar/insertOneByGN"),
  update: require("./titulo-pagar/update"),
  updateFileTitulo: require("./titulo-pagar/updateFileTitulo"),
  changeStatusTitulo: require("./titulo-pagar/changeStatusTitulo"),
  changeFieldTitulos: require("./titulo-pagar/changeFieldTitulos"),
  exportLayoutDatasys: require("./titulo-pagar/exportLayoutDatasys"),
  importLoteSolicitacoes: require("./titulo-pagar/importLote"),

  getAllRecorrencias: require("./recorrencia/getAll"),
  insertOneRecorrencia: require("./recorrencia/insertOne"),
  updateRecorrencia: require("./recorrencia/update"),
  deleteRecorrencia: require("./recorrencia/delete"),

  getAllCpVencimentosBordero,
  getAllCpItemsBordero
};
