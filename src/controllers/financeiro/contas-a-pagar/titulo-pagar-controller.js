const { db } = require("../../../../mysql");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { param } = require("../../../routes/financeiro/contas-pagar");

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
    // console.log(filters)
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
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (id_status && id_status !== "all") {
      where += ` AND t.id_status LIKE CONCAT(?,'%') `;
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
      if (data_de && data_ate) {
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND t.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND t.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    try {
      const [rowsTitulos] = await db.execute(
        `SELECT count(t.id) as total 
        FROM fin_cp_titulos t 
        LEFT JOIN filiais f ON f.id = t.id_filial ${where}`,
        params
      );
      const totalTitulos = (rowsTitulos && rowsTitulos[0]["total"]) || 0;

      var query = `
            SELECT 
                t.id, s.status, t.created_at, t.data_vencimento, t.descricao, t.valor,
                f.nome as filial, f.id_matriz,
                forn.nome as fornecedor, u.nome as solicitante
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante

            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      console.log(query);
      console.log(params);
      const [titulos] = await db.execute(query, params);

      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      console.log("ERRO TITULOS PAGAR GET_ALL", error);
      reject(error);
    }
  });
}

function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    // console.log(req.params)
    try {
      const [rowTitulo] = await db.execute(
        `
        SELECT t.*, st.status,
                f.id_grupo_economico,
                f.id_matriz,
                fo.nome as nome_fornecedor, 
                fo.cnpj as cnpj_fornecedor,
                fcc.nome as centro_custo,
                fr.manual as rateio_manual,
                CONCAT(pc.codigo, ' - ', pc.descricao) as plano_contas

            FROM fin_cp_titulos t 
            INNER JOIN fin_cp_status st ON st.id = t.id_status
            LEFT JOIN filiais f ON f.id = t.id_filial
            LEFT JOIN 
                fin_fornecedores fo ON fo.id = t.id_fornecedor
            LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
            LEFT JOIN
                fin_plano_contas pc ON pc.id = t.id_plano_contas
            LEFT JOIN fin_centros_custo fcc ON fcc.id = t.id_centro_custo
            WHERE t.id = ?
            `,
        [id]
      );

      const [itens] = await db.execute(
        `SELECT fcpti.*, CONCAT(fpc.codigo, ' - ',fpc.descricao) as plano_conta 
        FROM fin_cp_titulos_itens fcpti 
        LEFT JOIN fin_plano_contas fpc ON fpc.id = fcpti.id_plano_conta
        WHERE fcpti.id_titulo = ? 
        
        `,
        [id]
      );

      const [itens_rateio] = await db.execute(
        `SELECT fcpt.id_filial, FORMAT(fcpt.percentual * 100, 2) as percentual FROM fin_cp_titulos_rateio fcpt WHERE fcpt.id_titulo = ?`,
        [id]
      );

      const [historico] = await db.execute(
        `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ?`,
        [id]
      );

      const titulo = rowTitulo && rowTitulo[0];
      // console.log(titulo)
      resolve({ titulo, itens, itens_rateio, historico });
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function updateFileTitulo(req) {
  return new Promise(async (resolve, reject) => {
    const { id, fileUrl, campo } = req.body;
    try {
      if (!id) {
        resolve({ message: "Sucesso!" });
      }
      // Lista de campos válidos
      const camposValidos = [
        "url_xml",
        "url_nota_fiscal",
        "url_boleto",
        "url_contrato",
        "url_planilha",
        "url_txt",
      ]; // Adicione mais campos conforme necessário

      // Verificar se o nome do campo é válido
      if (!camposValidos.includes(campo)) {
        throw new Error(
          "Envie um campo válido; url_xml, url_nota_fiscal, url_boleto, url_contrato, url_planilha, url_txt"
        );
      }

      await db.execute(`UPDATE fin_cp_titulos SET ${campo} = ? WHERE id = ? `, [
        fileUrl,
        id,
      ]);

      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
}

function getAllCpTitulosBordero(req) {
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
    // console.log(filters)
    const {
      id,
      id_grupo_economico,
      tipo_data,
      fornecedor,
      range_data,
      descricao,
      id_matriz,
      id_filial,
      id_conta_bancaria,
      termo,
    } = filters || {};

    console.log(filters);
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
    if (id) {
      where += ` AND t.id LIKE CONCAT(?,'%') `;
      params.push(id);
    }
    if (descricao) {
      where += ` t.descricao LIKE CONCAT('%',?,'%')  `;
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

    where += ` 
    AND t.id_status = 3 
      AND tb.id_titulo IS NULL `;

    if (tipo_data && range_data) {
      const { from: data_de, to: data_ate } = range_data;
      if (data_de && data_ate) {
        where += ` AND t.${tipo_data} BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND t.${tipo_data} >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND t.${tipo_data} <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (id_grupo_economico && id_grupo_economico !== "all") {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    // console.log(where)

    try {
      const [rowQtdeTotal] = await db.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT DISTINCT 
          t.id as id_titulo, s.status, t.created_at, t.data_vencimento, t.descricao, t.valor,
          f.nome as filial, f.id_matriz,
          forn.nome as fornecedor, u.nome as solicitante
          FROM fin_cp_titulos t 
          LEFT JOIN fin_cp_status s ON s.id = t.id_status 
          LEFT JOIN filiais f ON f.id = t.id_filial 
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN users u ON u.id = t.id_solicitante
          LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_titulo = t.id

          ${where}
        ) AS subconsulta
        `,
        params
      );
      const totalTitulos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT DISTINCT 
                t.id as id_titulo, s.status, t.data_prevista as previsao, 
                t.descricao, t.valor as valor_total,
                f.nome as filial, f.id_matriz,
                forn.nome as nome_fornecedor, t.num_doc, t.data_pagamento
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            LEFT JOIN fin_cp_titulos_borderos tb ON tb.id_titulo = t.id

            ${where}

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      // console.log(query);
      // console.log(params);
      const [titulos] = await db.execute(query, params);

      const objResponse = {
        rows: titulos,
        pageCount: Math.ceil(totalTitulos / pageSize),
        rowCount: totalTitulos,
      };
      // console.log('Fetched Titulos', titulos.length)
      // console.log(objResponse)
      resolve(objResponse);
    } catch (error) {
      console.log("ERRO TITULOS PAGAR GET_ALL_CP_TITULOS_BORDERO", error);
      reject(error);
    }
  });
}

module.exports = {
  getAll,
  getOne,
  updateFileTitulo,

  getAllCpTitulosBordero,
};
