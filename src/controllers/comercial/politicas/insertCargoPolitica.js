const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id_cargo,
      id_escalonamento,
      id_politica,
    } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_cargo) {
        throw new Error(
          "ID do cargo não informado!"
        );
      }
      if (!id_escalonamento) {
        throw new Error(
          "ID do escalonamento não informado!"
        );
      }
      if (!id_politica) {
        throw new Error(
          "ID da política não informado!"
        );
      }
      conn = await db.getConnection();
      // Verificar se cargo já existe na política
      const [cargoExists] = await conn.execute(
        `SELECT id FROM comissao_politica_cargos WHERE id_politica =? AND id_cargo =?`,
        [id_politica, id_cargo]
      );
      if (cargoExists.length > 0) {
        throw new Error(
          "Cargo já existe na política!"
        );
      }

      // Inserir novo cargo na política
      const [result] = await conn.execute(
        `INSERT INTO comissao_politica_cargos (
          id_politica,
          id_cargo,
          id_escalonamento
        ) VALUES(?,?,?)`,
        [id_politica, id_cargo, id_escalonamento]
      );
      const newId = result.insertId;
      if (!newId) {
        throw new Error(`Cargo não inserido`);
      }
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLITICA",
        method: "INSERT_ONE_CARGO",
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
