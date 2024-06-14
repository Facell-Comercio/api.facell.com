const { db } = require("../../../../mysql");
const { checkUserPermission } = require("../../../helpers/checkUserPermission");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");

function getAllSolicitacoesNegadas(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    var where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    const params = [];

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT
          t.id 
          FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante

          ${where}
          AND t.id_status = 2
        ) AS subconsulta
        `
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT
                t.id, t.created_at as data_solicitacao,
                t.valor, forn.nome as nome_fornecedor,
                f.nome as filial, t.descricao 
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante

            ${where}
            AND t.id_status = 2
            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      console.error("ERROR_GET_ALL_SOLICITAÇÕES_NEGADAS", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllNotasFiscaisPendentes(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    var where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND t.id_solicitante = '${user.id}' `;
    }
    const params = [];

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT
            t.id 
          FROM fin_cp_titulos t 
          LEFT JOIN fin_cp_status s ON s.id = t.id_status 
          LEFT JOIN filiais f ON f.id = t.id_filial 
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN users u ON u.id = t.id_solicitante

          ${where}
          AND t.id_tipo_solicitacao = 2
          AND NOT t.id_status = 2 
          AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")
        ) AS subconsulta
        `
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
            SELECT
                t.id, t.created_at as data_solicitacao,
                t.valor, forn.nome as nome_fornecedor,
                f.nome as filial, t.descricao,
                t.url_nota_fiscal 
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            ${where}
            AND t.id_tipo_solicitacao = 2
            AND NOT t.id_status = 2 
            AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")

            ORDER BY 
                t.created_at DESC 
            LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      console.error(
        "ERROR_GET_ALL_SOLICITAÇÕES_COM_NOTAS_FISCAIS_PENDENTES",
        error
      );
      reject(error);
    } finally {
      conn.release();
    }
  });
}

function getAllRecorrenciasPendentes(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    var where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (
      !checkUserDepartment(req, "FINANCEIRO") &&
      !checkUserPermission(req, "MASTER")
    ) {
      where += ` AND r.id_user = '${user.id}' `;
    }
    const params = [];

    const conn = await db.getConnection();
    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
        FROM (
          SELECT 
            r.id_titulo
          FROM fin_cp_titulos_recorrencias r 
          LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
          LEFT JOIN users u ON u.id = r.id_user
          ${where}
          AND NOT r.lancado
        ) AS subconsulta
        `
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;

      var query = `
          SELECT 
            r.id_titulo, r.data_vencimento,
            UPPER(t.descricao) as descricao, r.valor,
            forn.nome as fornecedor,
            f.nome as filial,
            ge.nome as grupo_economico,
            u.nome as criador
          FROM fin_cp_titulos_recorrencias r 
          LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
          LEFT JOIN users u ON u.id = r.id_user
          ${where}
          AND NOT r.lancado
          ORDER BY r.data_vencimento
          LIMIT ? OFFSET ?`;
      params.push(pageSize);
      params.push(offset);
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      console.log("ERROR_GET_ALL_RECORRENCIAS_PENDENTES", error);
      reject(error);
    } finally {
      conn.release();
    }
  });
}

module.exports = {
  getAllSolicitacoesNegadas,
  getAllNotasFiscaisPendentes,
  getAllRecorrenciasPendentes,
};
