const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    const { conn_externa } = req.query;
    try {
      const { id_filial } = req.query;

      conn = conn_externa || (await db.getConnection());

      if (!id_filial) {
        throw new Error("ID da filial não informado!");
      }

      const [rowTotalDisponivel] = await conn.execute(
        `
        SELECT SUM(saldo) AS total_disponivel FROM datasys_caixas
        WHERE status = 'CONFIRMADO'
        AND saldo > 0
        AND id_filial = ?`,
        [id_filial]
      );
      const total_disponivel =
        (rowTotalDisponivel &&
          rowTotalDisponivel[0] &&
          rowTotalDisponivel[0]["total_disponivel"]) ||
        0;

      const [rows] = await conn.execute(
        `SELECT *
        FROM datasys_caixas
        WHERE status = 'CONFIRMADO' AND saldo > 0
        AND id_filial = ?
        ORDER BY data ASC`,
        [id_filial]
      );

      const objResponse = {
        rows: rows,
        total_disponivel: total_disponivel,
      };

      resolve(objResponse);
    } catch (error) {
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "GET_ALL_CAIXAS_COM_SALDO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
