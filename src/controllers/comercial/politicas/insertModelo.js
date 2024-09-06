const {
  containeranalysis,
} = require("googleapis/build/src/apis/containeranalysis");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id_modelo,
      id_cargo_politica,
      descricao,
      filiais,
    } = req.body;

    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (id_modelo) {
        throw new Error(
          "ID não deve ser passado!"
        );
      }
      if (!descricao) {
        throw new Error(
          "Descricão não informada!"
        );
      }
      if (filiais && filiais.length <= 0) {
        throw new Error(
          "Filiais não informadas!"
        );
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO comissao_politica_modelos (id_cargo_politica, descricao) VALUES (?,?)`,
        [id_cargo_politica, descricao]
      );
      const newId = result.insertId;

      for (const filial of filiais) {
        await conn.execute(
          `
          INSERT INTO comissao_politica_modelos_filiais (id_filial, id_cargo_politica, id_modelo) VALUES (?,?,?)
        `,
          [filial.id, id_cargo_politica, newId]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "INSERT_MODELO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
