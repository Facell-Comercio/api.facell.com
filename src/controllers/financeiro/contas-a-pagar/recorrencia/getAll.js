const { format } = require("date-fns");
const { db } = require("../../../../../mysql");
const {
  logger,
} = require("../../../../../logger");
const {
  checkUserDepartment,
} = require("../../../../helpers/checkUserDepartment");
const {
  checkUserPermission,
} = require("../../../../helpers/checkUserPermission");

module.exports = function getAllRecorrencias(
  req
) {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const conn = await db.getConnection();
    const departamentosUser =
      user.departamentos.map(
        (departamento) =>
          departamento.id_departamento
      );

    try {
      const { user } = req;
      const { filters } = req.query || {};
      const { mes, ano, a_lancar } = filters || {
        mes: format(new Date(), "MM"),
        ano: format(new Date(), "yyyy"),
      };

      const params = [];
      let where = "WHERE 1=1 ";

      if (
        !(
          checkUserPermission(req, "MASTER") ||
          checkUserDepartment(req, "FINANCEIRO")
        )
      ) {
        if (departamentosUser?.length > 0) {
          where += ` AND (r.id_user = '${
            user.id
          }' OR t.id_departamento IN (${departamentosUser.join(
            ","
          )})) `;
        } else {
          where += ` AND r.id_user = '${user.id}' `;
        }
      }

      if (parseInt(a_lancar)) {
        where += ` AND NOT r.lancado `;
      }

      where += ` AND YEAR(r.data_vencimento) = ?
          AND MONTH(r.data_vencimento) = ?`;
      params.push(ano);
      params.push(mes);

      const [recorrencias] = await conn.execute(
        `SELECT 
            r.*,
            UPPER(t.descricao) as descricao, r.valor,
            forn.nome as fornecedor,
            f.nome as filial, f.id_matriz,
            ge.nome as grupo_economico,
            u.nome as criador
          FROM fin_cp_titulos_recorrencias r 
          LEFT JOIN fin_cp_titulos t ON t.id = r.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN grupos_economicos ge ON ge.id = f.id_grupo_economico
          LEFT JOIN users u ON u.id = r.id_user
          ${where}
          ORDER BY r.data_vencimento
          `,
        params
      );
      resolve({ rows: recorrencias });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS A PAGAR",
        method: "GET_ALL_RECORRENCIAS",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
