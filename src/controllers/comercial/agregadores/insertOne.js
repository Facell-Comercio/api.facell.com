const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function insertOne(req) {
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

      controle,
      pos,
      upgrade,
      receita,
      qtde_aparelho,
      aparelho,
      acessorio,
      pitzi,
      fixo,
      wttx,
      live,
    } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
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
        !controle ||
        !pos ||
        !upgrade ||
        !receita ||
        !qtde_aparelho ||
        !aparelho ||
        !acessorio ||
        !pitzi ||
        !fixo ||
        !wttx ||
        !live ||
        !proporcional
      ) {
        throw new Error("Dados insuficientes!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO facell_metas (
          ref,
          ciclo,
          data_inicial,
          data_final,
          proporcional,

          nome,
          cpf,
          id_filial,
          filial,
          grupo_economico,
          cargo,
          tags,

          controle,
          pos,
          upgrade,
          receita,
          acessorio,
          pitzi,
          fixo,
          wttx,
          live,
          qtde_aparelho,
          aparelho
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [
          startOfDay(ref),
          startOfDay(ciclo),
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

          controle,
          pos,
          upgrade,
          receita,
          acessorio,
          pitzi,
          fixo,
          wttx,
          live,
          qtde_aparelho,
          aparelho,
        ]
      );

      const newId = result.insertId;

      if (!newId) {
        throw new Error(`Meta não inserida`);
      }

      await conn.rollback();
      // await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "AGREGADORES",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
