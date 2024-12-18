const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { hasPermission } = require("../../../../../helpers/hasPermission");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;
  const user = req.user;
  let conn;

  try {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { mes, ano, active, nome } = filters || {};

    let where = "WHERE 1=1";
    const params = [];

    let whereCampanha = "";
    const paramsCampanha = [];

    if (mes) {
      where += " AND MONTH(data_inicio) = ?";
      params.push(mes);
    }
    if (ano) {
      where += " AND YEAR(data_inicio) = ?";
      params.push(ano);
    }
    if (active !== undefined && active !== "all") {
      where += " AND active = ?";
      params.push(active ? 1 : 0);
    }
    if (nome) {
      where += " AND nome LIKE CONCAT('%',?, '%')";
      params.push(nome);
    }

    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.nome);

    if (!hasPermission(req, ["MASTER", "MAILING:VER_TUDO"])) {
      if (filiaisGestor.length > 0) {
        whereCampanha += ` AND (mc.filial IN (${filiaisGestor
          .map((value) => db.escape(value))
          .join(",")}) OR mv.id_user = ?)`;
        paramsCampanha.push(user.id);
      } else {
        if (user.id) {
          whereCampanha += ` AND mv.id_user = ? `;
          paramsCampanha.push(user.id);
        }
      }
    }

    conn = conn_externa || (await db.getConnection());

    const [rowQtdeTotal] = await conn.execute(
      `SELECT COUNT(id) as qtde FROM marketing_mailing_campanhas ${where}`,
      params
    );
    const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

    const limit = pagination ? " LIMIT ? OFFSET ? " : "";
    if (limit) {
      const offset = pageIndex * pageSize;
      params.push(pageSize);
      params.push(offset);
    }
    const [campanhas] = await conn.execute(
      `SELECT * FROM marketing_mailing_campanhas
        ${where}
        ORDER BY data_inicio, id DESC
        ${limit}
        `,
      params
    );

    //* CONTANDO A QUANTIDADE DE CLIENTES
    for (const campanha of campanhas) {
      const [rowCampanhaParent] = await conn.execute(
        `SELECT nome FROM marketing_mailing_campanhas WHERE id = ?`,
        [campanha.id_parent]
      );
      const campanhaParent = rowCampanhaParent && rowCampanhaParent[0];

      campanha.nome_parent = campanhaParent?.nome || "";

      const [subcampanhas] = await conn.execute(
        `SELECT id FROM marketing_mailing_campanhas WHERE id_parent = ?`,
        [campanha.id]
      );
      const ids = subcampanhas && subcampanhas.map((campanha) => campanha.id);
      ids.push(campanha.id);
      const [clientes] = await conn.execute(
        `
        SELECT COUNT(mc.id) as qtde FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_vendedores mv ON mv.nome = mc.vendedor
        WHERE id_campanha IN (${ids.map((value) => db.escape(value)).join(",")})
         ${whereCampanha}
        `,
        paramsCampanha
      );
      campanha.qtde_clientes = (clientes && clientes[0] && clientes[0].qtde) || 0;
    }

    const objResponse = {
      rows: campanhas,
      pageCount: Math.ceil(qtdeTotal / pageSize),
      rowCount: qtdeTotal,
    };

    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "GET_CAMPANHAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
