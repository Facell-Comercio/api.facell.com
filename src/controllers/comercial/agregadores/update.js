const { parse, startOfDay, startOfMonth } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      ref,
      ciclo,
      id_grupo_economico,
      grupo_economico,
      id_filial,
      filial,
      cargo,
      cpf,
      nome,
      tags,

      data_inicial,
      data_final,

      proporcional,

      tipo_agregacao,
      metas_agregadas,
    } = req.body;

    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (
        !ref ||
        !ciclo ||
        !id_grupo_economico ||
        !grupo_economico ||
        !id_filial ||
        !filial ||
        !cargo ||
        !cpf ||
        !nome ||
        !data_inicial ||
        !data_final ||
        !proporcional ||
        !tipo_agregacao ||
        !metas_agregadas
      ) {
        throw new Error("Dados insuficientes!");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE facell_agregadores SET
          ref = ?,
          ciclo = ?,
          data_inicial = ?,
          data_final = ?,
          proporcional = ?,

          nome = ?,
          cpf = ?,
          id_filial = ?,
          filial = ?,
          grupo_economico = ?,
          cargo = ?,
          tags = ?,

          tipo_agregacao = ?,
          metas_agregadas = ?
        WHERE id = ?`,
        [
          startOfMonth(ref),
          startOfMonth(ciclo),
          startOfDay(data_inicial),
          startOfDay(data_final),
          proporcional,

          nome,
          cpf,
          id_filial,
          filial,
          grupo_economico,
          cargo,
          tags,
          tipo_agregacao,
          metas_agregadas,
          id,
        ]
      );

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
