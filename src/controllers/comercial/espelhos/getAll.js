const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body || {};

    let conn;

    try {
      const { pagination, filters } = req.query;
      const { id_grupo_economico, mes, ano, tipo_meta } = filters || {};
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const params = [];
      let where = " WHERE 1=1 ";

      if (id_grupo_economico) {
        where += ` AND (fa.id_grupo_economico = ? OR
                      fm.id_grupo_economico = ? ) `;
        params.push(id_grupo_economico, id_grupo_economico);
      }
      if (mes) {
        where += ` AND MONTH(c.ciclo) = ? `;
        params.push(mes);
      }
      if (ano) {
        where += ` AND YEAR(c.ciclo) = ? `;
        params.push(ano);
      }
      if (tipo_meta !== undefined && tipo_meta !== "all") {
        if (tipo_meta === "consultor") {
          where += `  AND fm.id IS NOT NULL
                    AND fm.cargo IS NOT LIKE 'FILIAL'`;
        }
        if (tipo_meta === "agregador") {
          where += ` AND fa.id IS NOT NULL`;
        }
      }

      conn = conn_externa || (await db.getConnection());

      const [rowTotal] = await conn.execute(
        `SELECT COUNT(*) AS qtde
            FROM (
              SELECT c.id FROM comissao c
              LEFT JOIN metas fm ON fm.id = c.id_meta
              LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
              ${where}
            ) 
            as subconsulta
            `,
        params
      );
      const qtdeTotal = (rowTotal && rowTotal[0] && rowTotal[0]["qtde"]) || 0;

      const [ids] = await conn.execute(
        `
        SELECT c.id FROM comissao c
        LEFT JOIN metas fm ON fm.id = c.id_meta
        LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
        ${where}
        `,
        params
      );

      const [rowTotalContestacoes] = await conn.execute(
        `SELECT COUNT(*) AS qtde
            FROM (
              SELECT DISTINCT cc.id FROM comissao c
              LEFT JOIN comissao_contestacoes cc ON cc.id_comissao = c.id
              LEFT JOIN metas fm ON fm.id = c.id_meta
              LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
              ${where}
              AND cc.id IS NOT NULL
            ) 
            as subconsulta
            `,
        params
      );
      const qtdeTotalContestacoes =
        (rowTotalContestacoes && rowTotalContestacoes[0] && rowTotalContestacoes[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }

      const [rows] = await conn.execute(
        `
      SELECT
        c.*, c.updated AS att,
        COALESCE(fm.filial, fa.filial) AS filial,
        COALESCE(fm.cargo, fa.cargo) AS cargo,
        COALESCE(fm.nome, fa.nome) AS nome
      FROM comissao c
      LEFT JOIN metas fm ON fm.id = c.id_meta
      LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
      ${where} ${limit}
      `,
        params
      );
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        ids,
        qtdeTotalContestacoes,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "ESPELHOS",
        method: "GET_ALL_ESPELHOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
