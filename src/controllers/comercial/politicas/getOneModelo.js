const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [rowModelos] = await conn.execute(
        `
        SELECT id as id_modelo, descricao, id_cargo_politica FROM comissao_politica_modelos WHERE id = ?
        `,
        [id]
      );
      const modelo = rowModelos && rowModelos[0];
      const [filiais] = await conn.execute(
        `
        SELECT f.id, f.uf, f.nome 
        FROM comissao_politica_modelos_filiais pmf
        LEFT JOIN filiais f ON f.id = pmf.id_filial
        WHERE pmf.id_modelo = ?
        `,
        [id]
      );
      const objResponse = {
        ...modelo,
        filiais,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_ONE_MODELO",
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
