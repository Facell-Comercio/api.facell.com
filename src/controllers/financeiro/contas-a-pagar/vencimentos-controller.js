const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { logger } = require("../../../../logger");
require("dotenv").config();

function getAll(req) {
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
      id,
      id_grupo_economico,
      id_status,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
      nome_fornecedor,
      nome_user,
    } = filters || {};

    const params = [];
    if (id) {
      where += ` AND t.id = ? `;
      params.push(id);
    }
    if (id_status && id_status !== "all") {
      where += ` AND t.id_status = ? `;
      params.push(id_status);
    }

    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data =
        tipo_data == "data_prevista" || tipo_data == "data_vencimento"
          ? `tv.${tipo_data}`
          : `t.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
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
      const [rowsTitulos] = await conn.execute(
        `SELECT count(t.id) as total 
        FROM fin_cp_titulos t 
        LEFT JOIN filiais f ON f.id = t.id_filial 
        INNER JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        ${where}
        `,
        params
      );
      const totalTitulos = (rowsTitulos && rowsTitulos[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      var query = `
            SELECT 
                t.id, s.status, t.created_at, t.descricao, t.valor,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor, u.nome as solicitante
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            INNER JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN users u ON u.id = t.id_solicitante

            ${where}

            ORDER BY 
                t.created_at DESC 
            ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      // console.log(query);
      // console.log(params);
      const [titulos] = await conn.execute(query, params);
      // console.log(query, params);
      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      console.error("", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllVencimentosEFaturas(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const {
      pagination,
      filters,
      emBordero,
      emConciliacao,
      pago,
      id_bordero,
      minStatusTitulo,
      enabledStatusPgto,
    } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    let where = ` WHERE 1=1 `;
    // Somente o Financeiro/Master podem ver todos

    const {
      id_vencimento,
      id_titulo,
      id_grupo_economico,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      forma_pagamento_list,
      id_filial,
      id_conta_bancaria,
      id_conciliacao,
      dda,
      termo,
    } = filters || {};

    const params = [];
    if (termo) {
      where += ` AND (
        ccf.id LIKE CONCAT(?,'%') 
        OR t.id LIKE CONCAT(?,'%') 
        OR fcc.descricao LIKE CONCAT('%',?,'%')
        OR t.descricao LIKE CONCAT('%',?,'%')
        OR forn2.nome LIKE CONCAT('%',?,'%')
        OR forn.nome LIKE CONCAT('%',?,'%')
        OR CASE WHEN ccf.id THEN '-' ELSE t.num_doc END as num_doc LIKE CONCAT('%',?,'%')
        OR ccf.valor LIKE CONCAT('%',?,'%')
        OR tv.valor) LIKE CONCAT('%',?,'%')
        OR f2.nome LIKE CONCAT('%',?,'%')  
        OR f.nome LIKE CONCAT('%',?,'%')  
    )  `;
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);

      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
      params.push(termo);
    }
    if (id_vencimento) {
      where += ` AND (ccf.id = ? OR tv.id = ?)`;
      params.push(id_vencimento);
      params.push(id_vencimento);
    }

    if (id_titulo) {
      where += ` AND (ccf.id = ? OR t.id = ?)`;
      params.push(id_titulo);
      params.push(id_titulo);
    }
    if (id_bordero !== undefined) {
      where += ` AND (bi2.id_bordero OR bi.id_bordero)`;
      params.push(id_bordero);
      params.push(id_bordero);
    }

    if (descricao) {
      where += ` AND (fcc.descricao LIKE CONCAT('%',?,'%')
        OR t.descricao LIKE CONCAT('%',?,'%'))  `;
      params.push(descricao);
      params.push(descricao);
    }
    if (id_matriz && id_matriz !== "all") {
      where += ` AND (f.id_matriz = ? OR fcc.id_matriz = ?) `;
      params.push(id_matriz);
      params.push(id_matriz);
    }
    if (forma_pagamento_list && forma_pagamento_list.length > 0) {
      where += ` AND t.id_forma_pagamento IN ('${forma_pagamento_list.join(
        "','"
      )}')`;
    }
    if (id_filial && id_filial !== "all") {
      where += ` AND (f.id = ? OR f2.id = ?)`;
      params.push(id_filial);
      params.push(id_filial);
    }
    if (id_conta_bancaria) {
      where += ` AND b.id_conta_bancaria = ? `;
      params.push(id_conta_bancaria);
      params.push(id_conta_bancaria);
    }
    if (fornecedor) {
      where += ` AND (
        forn2.nome LIKE CONCAT('%',?,'%')
        OR forn.nome LIKE CONCAT('%',?,'%')) `;
      params.push(fornecedor);
      params.push(fornecedor);
    }

    // Determina o retorno com base se está ou não em borderô
    if (!!parseInt(emBordero) !== undefined) {
      if (!!parseInt(emBordero)) {
        where += ` AND CASE WHEN ccf.id THEN bi2.id_fatura ELSE bi.id_vencimento END IS NOT NULL`;
      } else {
        where += ` AND CASE WHEN ccf.id THEN bi2.id_fatura ELSE bi.id_vencimento END IS NULL`;
      }
    }

    // Determina o retorno com base se está !!parseInt(pago) ou não
    if (!!parseInt(pago) !== undefined) {
      if (!!parseInt(pago)) {
        where += ` AND CASE WHEN ccf.id THEN ccf.data_pagamento ELSE tv.data_pagamento END IS NOT NULL`;
      } else {
        where += ` AND CASE WHEN ccf.id THEN ccf.data_pagamento ELSE tv.data_pagamento END IS NULL`;
      }
    }

    // Filtra o status mínimo do título
    if (minStatusTitulo !== undefined) {
      where += ` AND t.id_status >= ? `;
      params.push(minStatusTitulo);
    }

    // Filtra os vencimentos com base no status
    if (enabledStatusPgto !== undefined && enabledStatusPgto.length > 0) {
      where += ` AND tv.status IN ('${enabledStatusPgto.join("','")}')`;
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND tv.${tipo_data} BETWEEN '${
          data_de.split("T")[0]
        }' AND '${data_ate.split("T")[0]}'  `;
      } else {
        if (data_de) {
          where += ` AND (tv.${tipo_data} >= '${
            data_de.split("T")[0]
          }' OR ccf.${tipo_data} >= '${data_de.split("T")[0]}') `;
        }
        if (data_ate) {
          where += ` AND (tv.${tipo_data} <= '${
            data_ate.split("T")[0]
          }' OR ccf.${tipo_data} <= '${data_ate.split("T")[0]}') `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND (f.id_grupo_economico = ? OR f2.id_grupo_economico = ?)`;
      params.push(id_grupo_economico);
      params.push(id_grupo_economico);
    }

    let conn;
    try {
      conn = await db.getConnection();
      let queryTotal = ` SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT
                COALESCE(ccf.id,t.id) as id_titulo 
              FROM fin_cp_titulos t 
              LEFT JOIN fin_cp_status s ON s.id = t.id_status 
              LEFT JOIN filiais f ON f.id = t.id_filial 
              LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
              LEFT JOIN users u ON u.id = t.id_solicitante
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
              LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
              LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
              LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
              LEFT JOIN fin_cartoes_corporativos_faturas ccf ON ccf.id = tv.id_fatura
              LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
              LEFT JOIN fin_fornecedores forn2 ON forn2.id = fcc.id_fornecedor
              LEFT JOIN filiais f2 ON f2.id = fcc.id_matriz 
              LEFT JOIN fin_cp_bordero_itens bi2 ON bi2.id_fatura = ccf.id

              ${where}
        ) as subconsulta
        `;
      const [rowsVencimentosFaturas] = await conn.execute(queryTotal, params);

      const qtdeVencimentosFaturas =
        (rowsVencimentosFaturas && rowsVencimentosFaturas[0]["qtde"]) || 0;
      const [rowsVencimentosFaturasValorTotal] = await conn.execute(
        `
            SELECT DISTINCT 
              SUM(COALESCE(ccf.valor,tv.valor)) as total 
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
            LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            LEFT JOIN fin_cartoes_corporativos_faturas ccf ON ccf.id = tv.id_fatura
            LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
            LEFT JOIN fin_fornecedores forn2 ON forn2.id = fcc.id_fornecedor
            LEFT JOIN filiais f2 ON f2.id = fcc.id_matriz 
            LEFT JOIN fin_cp_bordero_itens bi2 ON bi2.id_fatura = ccf.id

            ${where}
          `,
        params
      );
      const valorTotalVencimentosFaturas =
        (rowsVencimentosFaturasValorTotal &&
          rowsVencimentosFaturasValorTotal[0]["total"]) ||
        0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      const query = `
            SELECT DISTINCT 
              COALESCE(ccf.id,tv.id) as id_item,
              CASE WHEN ccf.id THEN 'fatura' ELSE 'vencimento' END as tipo,
              COALESCE(ccf.id,t.id) as id_titulo, 
              COALESCE(b.id,b2.id) as id_bordero, 
              COALESCE(ccf.id,tv.id) as id_vencimento,
              COALESCE(ccf.status,tv.status) as status, 
              COALESCE(ccf.data_prevista,tv.data_prevista) as data_prevista, 
              t.id_status, 
              UPPER(COALESCE(fcc.descricao,t.descricao)) as descricao,
              COALESCE(ccf.valor,tv.valor) as valor, 
              COALESCE(ccf.valor_pago,tv.valor_pago) as valor_pago, 
              COALESCE(ccf.data_vencimento,tv.data_vencimento) as data_vencimento,
              COALESCE(ccf.data_pagamento,tv.data_pagamento) as data_pagamento,
              COALESCE(ccf.tipo_baixa,tv.tipo_baixa) as tipo_baixa,
              COALESCE(f2.nome,f.nome) as filial, 
              COALESCE(fcc.id_matriz,f.id_matriz) as id_matriz,
              COALESCE(forn2.nome,forn.nome) as nome_fornecedor, 
              CASE WHEN ccf.id THEN "-" ELSE t.num_doc END as num_doc,
              COALESCE(fp.forma_pagamento, 'Cartão') as forma_pagamento,
              COALESCE(t.id_forma_pagamento, 6) as id_forma_pagamento,
              CASE WHEN ccf.id THEN "fatura" ELSE "vencimento" END as tipo
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
            LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
            LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            LEFT JOIN fin_cartoes_corporativos_faturas ccf ON ccf.id = tv.id_fatura
            LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
            LEFT JOIN fin_fornecedores forn2 ON forn2.id = fcc.id_fornecedor
            LEFT JOIN filiais f2 ON f2.id = fcc.id_matriz 
            LEFT JOIN fin_cp_bordero_itens bi2 ON bi2.id_fatura = ccf.id
            LEFT JOIN fin_cp_bordero b2 ON b2.id = bi2.id_bordero

            ${where}

            ORDER BY COALESCE(ccf.data_vencimento, tv.data_vencimento) ASC
            ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      // console.log(query);
      // console.log(params);
      const [vencimentosFaturas] = await conn.execute(query, params);
      const objResponse = {
        rows: vencimentosFaturas,
        pageCount: Math.ceil(qtdeVencimentosFaturas / pageSize),
        rowCount: qtdeVencimentosFaturas,
        valorTotal: valorTotalVencimentosFaturas,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "GET_ALL_VENCIMENTOS_E_FATURAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      console.error("", error);
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function getAllVencimentosBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const {
      pagination,
      filters,
      emBordero,
      emConciliacao,
      pago,
      id_bordero,
      minStatusTitulo,
      enabledStatusPgto,
      orderBy,
    } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
    // console.log(pageIndex, pageSize, offset)

    // Filtros
    let where = ` WHERE t.id_cartao IS NULL `;
    let order = orderBy || "ORDER BY t.created_at DESC";
    // Somente o Financeiro/Master podem ver todos

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
      id_conciliacao,
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
    if (id_bordero !== undefined) {
      where += ` AND  bi.id_bordero = ?`;
      params.push(id_bordero);
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

    // Determina o retorno com base se está ou não em borderô
    if (emBordero !== undefined) {
      if (emBordero) {
        where += ` AND bi.id_vencimento IS NOT NULL`;
      } else {
        where += ` AND bi.id_vencimento IS NULL`;
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
        where += ` AND tv.data_pagamento IS NOT NULL`;
      } else {
        where += ` AND tv.data_pagamento IS NULL`;
      }
    }

    // Filtra o status mínimo do título
    if (minStatusTitulo !== undefined) {
      where += ` AND t.id_status >= ? `;
      params.push(minStatusTitulo);
    }

    // Filtra os vencimentos com base no status
    if (enabledStatusPgto !== undefined && enabledStatusPgto.length > 0) {
      where += ` AND tv.status IN ('${enabledStatusPgto.join("','")}')`;
    }

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
      const queryQtdeTotal = `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT 
          tv.id 
          FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
            LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
            LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
            LEFT JOIN fin_conciliacao_bancaria_itens cbi 
              ON cbi.id_item = tv.id              
              AND cbi.tipo = 'pagamento'
          ${where}
        ) as subconsulta
        `;
      const [rowQtdeTotal] = await conn.execute(queryQtdeTotal, params);
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      let limit = "";
      if (pagination !== undefined) {
        limit = " LIMIT ? OFFSET ?";
        params.push(pageSize);
        params.push(offset);
      }

      var query = `
        SELECT DISTINCT 
            t.id as id_titulo, t.data_emissao, t.num_doc, t.id_forma_pagamento, t.id_status, UPPER(t.descricao) as descricao,
            tv.id as id_vencimento, 
            tv.status, 
            tv.data_vencimento,
            tv.data_prevista as previsao, 
            tv.valor as valor_total, 
            tv.valor_pago,
            tv.tipo_baixa,
            tv.obs,
            tv.cod_barras,
            tv.qr_code,
            tv.data_pagamento,
            f.nome as filial, f.id_matriz,
            forn.nome as nome_fornecedor,
            forn.cnpj as cnpj_fornecedor, 
            fp.forma_pagamento,
            bi.remessa,
            cbi.id as conciliado,
            cbi.id_conciliacao as id_conciliacao
        FROM fin_cp_titulos t 
        LEFT JOIN fin_cp_status s ON s.id = t.id_status 
        LEFT JOIN filiais f ON f.id = t.id_filial 
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN users u ON u.id = t.id_solicitante
        LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_titulo = t.id
        LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
        LEFT JOIN fin_cp_bordero b ON b.id = bi.id_bordero
        LEFT JOIN fin_formas_pagamento fp ON fp.id = t.id_forma_pagamento
        LEFT JOIN fin_dda dda ON dda.id_vencimento = tv.id
        LEFT JOIN fin_conciliacao_bancaria_itens cbi 
          ON cbi.id_item = tv.id              
          AND cbi.tipo = 'pagamento'

        
        ${where}

        ${order}
        ${limit}
        `;
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

function getVencimentosAPagar(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    // Filtros
    var where = ` WHERE t.id_forma_pagamento <> 6 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }

    const {
      id,
      id_grupo_economico,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
    } = filters || {};

    const params = [];
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data =
        tipo_data == "data_prevista" || tipo_data == "data_vencimento"
          ? `tv.${tipo_data}`
          : `t.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
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
      const [rowsVencimentos] = await conn.execute(
        `SELECT count(t.id) as total, SUM(tv.valor) as valor_total 
        FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

        ${where}
        AND (t.id_status = 3 OR t.id_status = 4)
        AND bi.id IS NULL
        `,
        params
      );
      const totalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["total"]) || 0;
      const valorTotalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["valor_total"]) || 0;
      var query = `
            SELECT 
                tv.id,tv.id_titulo, tv.data_vencimento, tv.data_prevista, t.descricao, tv.valor,
                f.nome as filial, f.id_matriz, t.num_doc,
                forn.nome as fornecedor
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

            ${where}
            AND bi.id IS NULL
            AND (t.id_status = 3 OR t.id_status = 4)
            ORDER BY 
              tv.data_prevista DESC 
            LIMIT ? OFFSET ?
            `;
      params.push(pageSize);
      params.push(offset);
      const [vencimentos] = await conn.execute(query, params);
      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
        valorTotal: valorTotalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "GET_VENCIMENTOS_A_PAGAR",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getVencimentosEmBordero(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    // Filtros
    var where = ` WHERE t.id_forma_pagamento <> 6 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }

    const {
      id,
      id_grupo_economico,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
    } = filters || {};

    const params = [];
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data =
        tipo_data == "data_prevista" || tipo_data == "data_vencimento"
          ? `tv.${tipo_data}`
          : `t.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
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
      const [rowsVencimentos] = await conn.execute(
        `SELECT count(t.id) as total, SUM(tv.valor) as valor_total 
        FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

        ${where}
        AND tv.data_pagamento IS NULL
        AND bi.id IS NOT NULL
        `,
        params
      );
      const totalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["total"]) || 0;
      const valorTotalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["valor_total"]) || 0;

      params.push(pageSize);
      params.push(offset);

      const [vencimentos] = await conn.execute(
        `
        SELECT 
                tv.id_titulo, tv.data_vencimento, tv.data_prevista, tv.valor,
                t.descricao, t.num_doc,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor,
                bi.id_bordero
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

            ${where}
            AND tv.data_pagamento IS NULL
            AND bi.id IS NOT NULL
            ORDER BY 
                tv.data_prevista ASC 
            LIMIT ? OFFSET ?`,
        params
      );

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
        valorTotal: valorTotalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "GET_VENCIMENTOS_EM_BORDERO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getVencimentosPagos(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination, filters } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    // Filtros
    var where = ` WHERE t.id_forma_pagamento <> 6 `;
    // Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }

    const {
      id,
      id_grupo_economico,
      tipo_data,
      range_data,
      descricao,
      id_matriz,
    } = filters || {};

    const params = [];
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (descricao) {
      where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (id_matriz) {
      where += ` AND f.id_matriz = ? `;
      params.push(id_matriz);
    }

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;

      const campo_data =
        tipo_data == "data_prevista" || tipo_data == "data_vencimento"
          ? `tv.${tipo_data}`
          : `t.${tipo_data}`;

      if (data_de && data_ate) {
        where += ` AND ${campo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND ${campo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND ${campo_data} <= '${data_ate.split("T")[0]}' `;
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
      const [rowsVencimentos] = await conn.execute(
        `SELECT count(t.id) as total, SUM(tv.valor) as valor_total 
        FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

        ${where}
        AND bi.id IS NOT NULL
        AND tv.data_pagamento IS NOT NULL
        `,
        params
      );
      const totalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["total"]) || 0;
      const valorTotalVencimentos =
        (rowsVencimentos && rowsVencimentos[0]["valor_total"]) || 0;

      var query = `
            SELECT 
                tv.id_titulo, tv.data_vencimento, tv.data_prevista, tv.valor,
                t.descricao, t.num_doc,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor,
                bi.id_bordero,
                tv.data_pagamento, tv.tipo_baixa, tv.valor_pago
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id

            ${where}
            AND bi.id IS NOT NULL
            AND tv.data_pagamento IS NOT NULL
            ORDER BY 
                tv.data_prevista DESC 
            LIMIT ? OFFSET ?
            `;
      params.push(pageSize);
      params.push(offset);
      const [vencimentos] = await conn.execute(query, params);
      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
        valorTotal: valorTotalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "GET_VENCIMENTOS_PAGOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function changeFieldVencimentosFaturas(req) {
  return new Promise(async (resolve, reject) => {
    const { value: data_prevista, itens } = req.body;
    // const itens = [
    //   {id_item: 1, tipo: 'vencimento'},
    //   {id_item: 2, tipo: 'fatura'},
    // ]
    const conn = await db.getConnection();

    await conn.beginTransaction();
    try {
      if (!data_prevista) {
        throw new Error("Preencha a previsão de pagamento!");
      }
      if (!itens || !itens?.length) {
        throw new Error("Nenhum item selecionado!");
      }

      for (const item of itens) {
        if (!item) {
          throw new Error(`Item não itendificado ${JSON.stringify(item)}`);
        }
        const id_item = item.id_item;

        // * ALTERAÇÃO DO VENCIMENTO:
        if (item.tipo === "vencimento") {
          // ^ Vamos verificar se já está em um bordero, se estiver, vamos impedir a mudança na data de pagamento:
          const [rowBordero] = await conn.execute(
            `SELECT id FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
            [id_item]
          );
          const bordero = rowBordero && rowBordero[0];
          if (bordero) {
            throw new Error(
              `O(a) ${item.tipo} já consta em bordero. Descrição: ${item.descricao}, valor: ${item.valor}`
            );
          }

          const [rowTitulo] = await conn.execute(
            `SELECT 
              t.id, t.id_status, tv.status
            FROM fin_cp_titulos_vencimentos tv
            INNER JOIN fin_cp_titulos t ON t.id = tv.id_titulo
            WHERE tv.id = ? `,
            [item.id_item]
          );
          const titulo = rowTitulo && rowTitulo[0];
          if (!titulo) {
            throw new Error(
              `Titulo do vencimento ${item.id_item} não encontrado...`
            );
          }
          if (titulo.id_status >= 4) {
            throw new Error(
              `Alteração rejeitada pois o título ${titulo.id} já consta como ${
                titulo.id_status === 4 ? "pago parcial" : "pago"
              }!`
            );
          }

          if (!bordero || bordero.length === 0) {
            await conn.execute(
              `UPDATE fin_cp_titulos_vencimentos SET data_prevista = ? WHERE id = ? `,
              [new Date(data_prevista), id_item]
            );
          }
        }

        // * ALTERAÇÃO DA FATURA:
        if (item.tipo === "fatura") {
          // ^ Vamos verificar se já está em um bordero, se estiver, vamos impedir a mudança na data de pagamento:
          const [rowBordero] = await conn.execute(
            `SELECT id FROM fin_cp_bordero_itens WHERE id_fatura = ?`,
            [id_item]
          );
          const bordero = rowBordero && rowBordero[0];
          if (bordero) {
            throw new Error(
              `A Fatura já consta em bordero. Descrição: ${item.descricao}, valor: ${item.valor}`
            );
          }

          // Atualizar a fatura:
          await conn.execute(
            `UPDATE fin_cartoes_corporativos_faturas SET data_prevista = ? WHERE id = ?`,
            [new Date(data_prevista), id_item]
          );

          // Atualizar os vencimentos da fatura:
          await conn.execute(
            `UPDATE fin_cp_titulos_vencimentos SET data_prevista = ? WHERE id_fatura = ?`,
            [new Date(data_prevista), id_item]
          );
        }
      }

      await conn.commit();
      resolve(true);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "VENCIMENTOS",
        method: "CHANGE_FIELD_VENCIMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAll,
  getAllVencimentosBordero,
  getVencimentosAPagar,
  getVencimentosEmBordero,
  getVencimentosPagos,
  changeFieldVencimentosFaturas,
  getAllVencimentosEFaturas,
};
