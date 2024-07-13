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
      // console.log(query, params, titulos);
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
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

        ${where}
        AND (t.id_status = 3 OR t.id_status = 4)
        AND tb.id IS NULL
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
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

            ${where}
            AND tb.id IS NULL
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
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

        ${where}
        AND tv.data_pagamento IS NULL
        AND tb.id IS NOT NULL
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
                tb.id_bordero
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

            ${where}
            AND tv.data_pagamento IS NULL
            AND tb.id IS NOT NULL
            ORDER BY 
                tv.data_prevista DESC 
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
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

        ${where}
        AND tb.id IS NOT NULL
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
                tb.id_bordero,
                tv.data_pagamento, tv.tipo_baixa, tv.valor_pago
            FROM fin_cp_titulos_vencimentos tv
            LEFT JOIN fin_cp_titulos t ON tv.id_titulo = t.id
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id

            ${where}
            AND tb.id IS NOT NULL
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

function changeFieldVencimentos(req) {
  return new Promise(async (resolve, reject) => {
    const { value, ids } = req.body;
    const conn = await db.getConnection();

    await conn.beginTransaction();
    try {
      if (!value) {
        throw new Error("VALOR da alteração não informado!");
      }
      if (ids && ids.length <= 0) {
        throw new Error("VENCIMENTOS a serem alteradas não selecionadas!");
      }

      for (const id of ids) {
        const [rowTitulo] = await conn.execute(
          `SELECT 
            t.id,t.id_status, tv.status
          FROM fin_cp_titulos_vencimentos tv
          INNER JOIN fin_cp_titulos t ON t.id = tv.id_titulo
          WHERE tv.id = ? `,
          [id]
        );
        const titulo = rowTitulo && rowTitulo[0];
        console.log(titulo);
        if (titulo.id_status >= 4) {
          throw new Error(
            `Alteração rejeitada pois o título ${titulo.id} já consta como ${
              titulo.id_status === 4 ? "pago parcial" : "pago"
            }!`
          );
        }
        // ^ Vamos verificar se o título já está em um bordero, se estiver, vamos impedir a mudança na data de pagamento:
        const [rowBordero] = await conn.execute(
          `SELECT id FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
          [id]
        );
        const bordero = rowBordero && rowBordero[0];

        if (!bordero || bordero.length === 0) {
          await conn.execute(
            `UPDATE fin_cp_titulos_vencimentos SET data_prevista = ? WHERE id = ? `,
            [new Date(value), id]
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
  getVencimentosAPagar,
  getVencimentosEmBordero,
  getVencimentosPagos,
  changeFieldVencimentos,
};
