const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { checkUserFilial } = require("../../../helpers/checkUserFilial");
const { hasPermission } = require("../../../helpers/hasPermission");

module.exports = function getAll(req) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.id_filial);

    const { filters, pagination } = req.query;
    const {
      id_filial,
      id_grupo_economico,
      nome,
      cpf,
      cargo,
      mes,
      ano,
      cpf_list,
      agregacao,
      tipo_data,
      range_data,
    } = filters || {};
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const params = [];

    let where = ` WHERE 1=1 `;

    if (id_filial) {
      where += ` AND fm.id_filial = ? `;
      params.push(id_filial);
    }
    if (id_grupo_economico) {
      where += ` AND f.id_grupo_economico = ? `;
      params.push(id_grupo_economico);
    }
    if (nome) {
      where += ` AND fm.nome LIKE CONCAT('%',?,'%') `;
      params.push(nome);
    }
    if (cpf) {
      where += ` AND fm.cpf LIKE CONCAT(?,'%') `;
      params.push(cpf);
    }
    if (cargo) {
      where += ` AND fm.cargo LIKE CONCAT('%',?,'%') `;
      params.push(cargo);
    }
    if (cpf_list && cpf_list.length > 0 && cpf_list[0] !== "") {
      where += ` AND NOT fm.cpf IN ('${cpf_list.join("','")}') `;
    }
    if (agregacao) {
      where += ` AND fm.cargo ${agregacao === "FILIAL" ? "=" : "<>"} "FILIAL" `;
    }

    if (!hasPermission(req, ["MASTER", "METAS:METAS_VER_TODAS"])) {
      if (filiaisGestor.length > 0) {
        where += ` AND (fm.id_filial IN ('${filiaisGestor.join("','")}') OR fm.cpf = ?)`;
        params.push(user.cpf);
      } else {
        if (user.cpf) {
          where += ` AND fm.cpf = ? `;
          params.push(user.cpf);
        }
      }
    }
    if (mes) {
      where += ` AND MONTH(fm.ref) = ? `;
      params.push(mes);
    }

    if (ano) {
      where += ` AND YEAR(fm.ref) = ? `;
      params.push(ano);
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
              FROM (
                SELECT 
                  fm.id
                FROM metas fm
                LEFT JOIN filiais f ON f.id = fm.id_filial
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
                fm.*,
                f.nome as filial,
                gp.nome as grupo_economico
              FROM metas fm
              LEFT JOIN filiais f ON f.id = fm.id_filial
              LEFT JOIN grupos_economicos gp ON gp.id = f.id_grupo_economico
              ${where}
              
              ORDER BY fm.id DESC
              ${limit}
              `,
        params
      );

      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        canView:
          hasPermission(req, ["MASTER", "METAS:METAS_EDITAR"]) ||
          checkUserFilial(
            req,
            rows.map((row) => row.filial),
            true
          ),
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
