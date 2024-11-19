const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { filters } = req.query;
    const { categoria, segmento } = filters || {};

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    let where = " WHERE 1=1 ";
    const params = [];
    if (categoria) {
      where += ` AND categoria LIKE CONCAT('%',?,'%') `;
      params.push(categoria);
    }
    if (segmento) {
      where += ` AND segmento LIKE CONCAT('%',?,'%') `;
      params.push(segmento);
    }

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsSegmentos] = await conn.execute(
        `
          SELECT * FROM comissao_segmentos
          ${where}
          AND active
        `,
        params
      );

      resolve(rowsSegmentos);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_SEGMENTOS",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
