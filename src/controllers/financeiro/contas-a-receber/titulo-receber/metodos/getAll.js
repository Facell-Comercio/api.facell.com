const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { pagination, filters } = req.query || {};
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };

      const offset = pageIndex > 0 ? pageSize * pageIndex : 0;
      // console.log(pageIndex, pageSize, offset)

      // Filtros
      let where = ` WHERE 1=1 `;
      //* Somente o Financeiro/Master podem ver todos
      // if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
      //   // where += ` AND t.id_user = '${user.id}'`;
      //   if (departamentosUser?.length > 0) {
      //     where += ` AND (t.id_user = '${
      //       user.id
      //     }' OR  t.id_departamento IN (${departamentosUser.join(",")})) `;
      //   } else {
      //     where += ` AND t.id_user = '${user.id}' `;
      //   }
      // }
      const {
        id,
        id_grupo_economico,
        grupo_economico_list,
        id_status,
        status_list,
        tipo_data,
        range_data,
        descricao,
        id_matriz,
        arquivados,
        nome_fornecedor,
        nome_user,
        filial,
        id_filial,
        num_doc,
        valor_maximo,
      } = filters || {};
      const params = [];
      if (id) {
        where += ` AND t.id = ? `;
        params.push(id);
      }

      if (id_status && id_status !== "all") {
        where += ` AND t.id_status = ?`;
        params.push(id_status);
      }
      if (status_list && status_list.length > 0) {
        where += ` AND t.id_status IN (${status_list.map((value) => db.escape(value)).join(",")})`;
      }
      if (descricao) {
        where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
        params.push(descricao);
      }
      if (id_matriz) {
        where += ` AND f.id_matriz = ? `;
        params.push(id_matriz);
      }
      if (!arquivados) {
        where += ` AND t.id_status != 0 `;
      }

      if (nome_fornecedor) {
        where += ` AND (forn.razao LIKE CONCAT('%', ?, '%') OR  forn.nome LIKE CONCAT('%', ?, '%')) `;
        params.push(nome_fornecedor);
        params.push(nome_fornecedor);
      }

      if (nome_user) {
        where += ` AND u.nome LIKE CONCAT('%', ?, '%') `;
        params.push(nome_user);
      }
      if (num_doc) {
        where += ` AND t.num_doc LIKE CONCAT('%', ?, '%') `;
        params.push(String(num_doc).trim());
      }

      if (tipo_data && range_data) {
        const { from: data_de, to: data_ate } = range_data;

        const campo_data =
          tipo_data == "data_prevista" ||
          tipo_data == "data_vencimento" ||
          tipo_data == "data_pagamento"
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
      if (grupo_economico_list && grupo_economico_list.length > 0) {
        where += ` AND f.id_grupo_economico IN (${grupo_economico_list
          .map((value) => db.escape(value))
          .join(",")})`;
      }

      if (filial) {
        where += ` AND f.nome LIKE CONCAT("%", ?,"%")`;
        params.push(filial);
      }
      if (id_filial) {
        where += ` AND f.id = ?`;
        params.push(id_filial);
      }
      if (valor_maximo) {
        where += ` AND t.valor <= ? `;
        params.push(valor_maximo);
      }

      const [rowsTitulos] = await conn.execute(
        `SELECT count(t.id) as total 
          FROM fin_cr_titulos t
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id_titulo = t.id
          LEFT JOIN users u ON u.id = t.id_user
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          ${where}
          `,
        params
      );
      const totalTitulos = (rowsTitulos && rowsTitulos[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      let query = `
              SELECT DISTINCT
                  t.id, s.status, t.created_at, t.num_doc, t.descricao, t.valor_liquido as valor,
                  f.nome as filial, f.id_matriz,
                  forn.nome as fornecedor, forn.cnpj as cnpj_fornecedor, u.nome as criador
              FROM fin_cr_titulos t
              LEFT JOIN fin_cr_status s ON s.id = t.id_status
              LEFT JOIN filiais f ON f.id = t.id_filial
              LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
              LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id_titulo = t.id
              LEFT JOIN users u ON u.id = t.id_user
  
            ${where}
  
            ORDER BY
                t.id DESC
            ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const [titulos] = await conn.execute(query, params);
      // console.log(query, params);
      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
