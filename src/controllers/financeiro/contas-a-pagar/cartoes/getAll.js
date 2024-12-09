const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { checkUserDepartment } = require("../../../../helpers/checkUserDepartment");
const { hasPermission } = require("../../../../helpers/hasPermission");
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
    const { id_matriz, descricao, nome_portador, active } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const params = [];

    let where = ` WHERE 1=1 `;
    if (id_matriz) {
      where += ` AND fcc.id_matriz = ? `;
      params.push(id_matriz);
    }
    if (descricao) {
      where += ` AND fcc.descricao LIKE CONCAT('%',?,'%') `;
      params.push(descricao);
    }
    if (nome_portador) {
      where += ` AND fcc.nome_portador LIKE CONCAT('%',?,'%') `;
      params.push(nome_portador);
    }
    if (active) {
      where += ` AND fcc.active = ? `;
      params.push(active);
    }

    if (!checkUserDepartment(req, "FINANCEIRO") && !hasPermission(req, "MASTER")) {
      where += ` AND ucc.id_user = '${user.id}' `;
    }

    const conn = await db.getConnection();
    try {
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
              FROM (
              SELECT fcc.id 
                FROM fin_cartoes_corporativos fcc
                LEFT JOIN filiais f ON f.id_matriz = fcc.id_matriz
                LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
                LEFT JOIN users_cartoes_corporativos ucc ON ucc.id_cartao = fcc.id
                ${where}
                GROUP BY fcc.id) 
              as subconsulta
              `,
        params
      );
      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const [rows] = await conn.execute(
        `
              SELECT fcc.*,
              CASE WHEN f.id_matriz = 18 THEN f.nome ELSE ge.nome END as matriz 
              FROM fin_cartoes_corporativos fcc
              LEFT JOIN filiais f ON f.id_matriz = fcc.id_matriz 
              LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
              LEFT JOIN users_cartoes_corporativos ucc ON ucc.id_cartao = fcc.id
              ${where}
              
              GROUP BY fcc.id
              ${limit}
              `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
