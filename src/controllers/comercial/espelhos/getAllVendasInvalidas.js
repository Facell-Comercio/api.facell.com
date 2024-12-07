const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const getAll = require("./getAll");
const { subMonths } = require("date-fns");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { filters } = req.query || {};
    const { id_comissao } = filters || {};
    conn = conn_externa || (await db.getConnection());

    const params = [];
    const paramsInadimplencia = [];
    let where = " WHERE 1=1 ";

    const [rowEspelho] = await conn.execute(
      `
      SELECT
        c.*,
        COALESCE(fm.filial, fa.filial) AS filial,
        COALESCE(fm.cargo, fa.cargo) AS cargo,
        COALESCE(fm.cpf, fa.cpf) AS cpf,
        COALESCE(fm.data_inicial, fa.data_inicial) AS data_inicial,
        COALESCE(fm.data_final, fa.data_final) AS data_final,
        CASE
          WHEN fm.id IS NOT NULL THEN "meta"
          WHEN fa.id IS NOT NULL THEN "agregador"
        END as tipo,
        fa.tipo_agregacao, fa.metas_agregadas
      FROM comissao c
      LEFT JOIN metas fm ON fm.id = c.id_meta
      LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
      WHERE c.id =?`,
      [id_comissao]
    );

    const espelho = rowEspelho && rowEspelho[0];
    if (!espelho) {
      throw new Error("Espelho não encontrado!");
    }

    // console.log(espelho);

    const { tipo, cpf, tipo_agregacao, metas_agregadas, data_inicial, data_final } = espelho;

    const data_de_inadimplencia = subMonths(data_inicial, 1);
    const data_ate_inadimplencia = subMonths(data_final, 1);

    if (tipo === "meta") {
      where += ` AND (data_venda BETWEEN ? AND ?) AND cpf_vendedor = ? `;

      params.push(data_inicial, data_final, cpf);
      paramsInadimplencia.push(data_de_inadimplencia, data_ate_inadimplencia, cpf);
    }

    if (tipo === "agregador") {
      const metas = metas_agregadas.split(";");

      if (tipo_agregacao === "FILIAL") {
        where += `
        AND (data_venda BETWEEN ? AND ?)
        AND filial IN ('${metas.join("','")}') `;
        params.push(data_inicial, data_final);
        paramsInadimplencia.push(data_de_inadimplencia, data_ate_inadimplencia);
      }
      if (tipo_agregacao === "VENDEDOR") {
        where += `
        AND (data_venda BETWEEN ? AND ?)
        AND cpf_vendedor IN ('${metas.join("','")}') `;
        params.push(data_inicial, data_final);
        paramsInadimplencia.push(data_de_inadimplencia, data_ate_inadimplencia);
      }
    }

    const [vendas_invalidas] = await conn.execute(
      `
      SELECT *
      FROM comissao_vendas_invalidas
      ${where}
      AND tipo <> 'INADIMPLÊNCIA'
      `,
      params
    );
    const [vendas_invalidas_inadimplencias] = await conn.execute(
      `
      SELECT *
      FROM comissao_vendas_invalidas
      ${where}
      AND tipo = 'INADIMPLÊNCIA'
      `,
      paramsInadimplencia
    );

    res.status(200).json([...vendas_invalidas, ...vendas_invalidas_inadimplencias]);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ALL_VENDAS_INVALIDAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
