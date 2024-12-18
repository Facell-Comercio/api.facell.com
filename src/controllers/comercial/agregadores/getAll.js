const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { hasPermission } = require("../../../helpers/hasPermission");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { filters, pagination } = req.query;
    const { id_filial, id_grupo_economico, nome, cpf, cargo, mes, ano, tipo_agregacao } =
      filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const params = [];

    let where = ` WHERE 1=1 `;

    if (!hasPermission(req, ["MASTER", "METAS:AGREGADORES_VER_TUDO"])) {
      if (user.cpf) {
        where += ` AND fa.cpf = ? `;
        params.push(user.cpf);
      }
    }

    if (id_filial) {
      where += ` AND fa.id_filial = ? `;
      params.push(id_filial);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (nome) {
      where += ` AND fa.nome LIKE CONCAT('%',?,'%') `;
      params.push(nome);
    }
    if (cpf) {
      where += ` AND fa.cpf LIKE CONCAT(?,'%') `;
      params.push(cpf);
    }
    if (cargo) {
      where += ` AND fa.cargo LIKE CONCAT('%',?,'%') `;
      params.push(cargo);
    }
    if (tipo_agregacao) {
      where += ` AND fa.tipo_agregacao LIKE CONCAT('%',?,'%') `;
      params.push(tipo_agregacao);
    }

    if (mes) {
      where += ` AND MONTH(fa.ref) = ? `;
      params.push(mes);
    }

    if (ano) {
      where += ` AND YEAR(fa.ref) = ? `;
      params.push(ano);
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
              FROM (
                SELECT 
                  fa.id
                FROM metas_agregadores fa
                LEFT JOIN filiais f ON f.id = fa.id_filial
                LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
                ${where}
              ) 
              as subconsulta
              `,
        params
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [rows] = await conn.execute(
        `
              SELECT 
                fa.*,
                f.nome as filial,
                gp.nome as grupo_economico
              FROM metas_agregadores fa
              LEFT JOIN filiais f ON f.id = fa.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              ${where}
              
              ORDER BY fa.id DESC
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
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
