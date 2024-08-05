const { parse, startOfDay } = require("date-fns");
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
        !live
      ) {
        throw new Error("Dados insuficientes!");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE facell_metas SET
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

          controle = ?,
          pos = ?,
          upgrade = ?,
          receita = ?,
          acessorio = ?,
          pitzi = ?,
          fixo = ?,
          wttx = ?,
          live = ?,
          qtde_aparelho = ?,
          aparelho = ?
        WHERE id = ?`,
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
          id,
        ]
      );

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "METAS",
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
