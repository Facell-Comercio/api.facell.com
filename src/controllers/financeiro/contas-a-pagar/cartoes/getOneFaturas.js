const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
module.exports = function getOneFaturas(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    const params = [];
    const conn = await db.getConnection();
    try {
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

      resolve({
        rows: rowVencimentosEmFatura,
        pageCount: Math.ceil(totalVencimentosEmFatura / pageSize),
        rowCount: totalVencimentosEmFatura,
      });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_ONE_FATURAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
};
