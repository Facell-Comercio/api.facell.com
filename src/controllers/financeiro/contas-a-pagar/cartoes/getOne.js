const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function getOne(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    let conn;
    try {
      conn = await db.getConnection();
      const [rowCartoes] = await conn.execute(
        `
              SELECT fcc.*, f.id_grupo_economico, forn.nome as nome_fornecedor
              FROM fin_cartoes_corporativos fcc
              LEFT JOIN filiais f ON f.id = fcc.id_matriz
              LEFT JOIN fin_fornecedores forn ON forn.id = fcc.id_fornecedor
              WHERE fcc.id = ?
              `,
        [id]
      );
      const cartao = rowCartoes && rowCartoes[0];

      const [rowVencimentosEmFaturaQTD] = await conn.execute(
        `
          SELECT COUNT(*) AS qtde
                FROM(
                SELECT id FROM fin_cartoes_corporativos_faturas
                WHERE id_cartao = ?
                    )
                as subconsulta
              `,
        [id]
      );
      const totalVencimentosEmFatura =
        (rowVencimentosEmFaturaQTD && rowVencimentosEmFaturaQTD[0]["qtde"]) ||
        0;

      const [rowVencimentosEmFatura] = await conn.execute(
        `
              SELECT 
                  *
              FROM fin_cartoes_corporativos_faturas
              WHERE id_cartao = ?
              ORDER BY 
                id DESC
              LIMIT ? OFFSET ?
              `,
        [id, pageSize, offset]
      );

      const [users] = await conn.execute(
        `
              SELECT 
                  ucc.id, u.nome, u.img_url
              FROM users_cartoes_corporativos ucc
              LEFT JOIN users u ON u.id = ucc.id_user
              WHERE ucc.id_cartao = ?
              `,
        [id]
      );

      resolve({
        ...cartao,
        faturas: {
          rows: rowVencimentosEmFatura,
          pageCount: Math.ceil(totalVencimentosEmFatura / pageSize),
          rowCount: totalVencimentosEmFatura,
        },
        users,
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
