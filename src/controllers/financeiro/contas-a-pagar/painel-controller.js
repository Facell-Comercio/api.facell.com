const { db } = require("../../../../mysql");
const { hasPermission } = require("../../../helpers/hasPermission");
const { checkUserDepartment } = require("../../../helpers/checkUserDepartment");
const { logger } = require("../../../../logger");

function getAllSolicitacoesNegadas(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;

    const { pagination } = req.query || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    let where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
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
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      const query = `
            SELECT
                t.id, t.created_at as data_solicitacao,
                t.valor, forn.nome as nome_fornecedor,
                f.nome as filial, t.descricao,
                u.nome as criador 
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante

            ${where}
            AND t.id_status = 2
            ORDER BY 
                t.created_at DESC 
            ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "PAINEL",
        method: "GET_ALL_SOLICITAÇÕES_NEGADAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
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

    let where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
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
          AND NOT t.id_status = 0 
          AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")
        ) AS subconsulta
        `
      );
      const totalVencimentos = (rowQtdeTotal && rowQtdeTotal[0]["qtde"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      const query = `
            SELECT
                t.id, t.created_at as data_solicitacao,
                t.valor, forn.nome as nome_fornecedor,
                f.nome as filial, t.descricao,
                t.url_nota_fiscal,
                u.nome as criador
            FROM fin_cp_titulos t 
            LEFT JOIN fin_cp_status s ON s.id = t.id_status 
            LEFT JOIN filiais f ON f.id = t.id_filial 
            LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
            LEFT JOIN users u ON u.id = t.id_solicitante
            ${where}
            AND t.id_tipo_solicitacao = 2
            AND NOT t.id_status = 2 
            AND NOT t.id_status = 0 
            AND (t.url_nota_fiscal IS NULL OR t.url_nota_fiscal = "")

            ORDER BY 
                t.created_at DESC 
            ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "PAINEL",
        method: "GET_ALL_SOLICITAÇÕES_COM_NOTAS_FISCAIS_PENDENTES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
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

    let where = ` WHERE 1=1 `;
    //^ Somente o Financeiro/Master podem ver todos
    if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
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
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      const query = `
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
          ${limit}`;
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const [vencimentos] = await conn.execute(query, params);

      const objResponse = {
        rows: vencimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "PAINEL",
        method: "GET_ALL_RECORRENCIAS_PENDENTES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
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
