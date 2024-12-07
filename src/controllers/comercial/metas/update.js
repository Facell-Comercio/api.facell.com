const { parse, startOfDay, startOfMonth, isEqual, isAfter } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { hasPermission } = require("../../../helpers/hasPermission");
const { normalizeNumberOnly } = require("../../../helpers/mask");

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
    const filiaisGestor = user.filiais
      .filter((filial) => filial.gestor)
      .map((filial) => filial.id_filial);

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

      //* Validação de permissão de edição
      const [rowsMetas] = await conn.execute(
        `
        SELECT id_filial FROM metas WHERE id = ?
        `,
        [id]
      );
      const meta = rowsMetas && rowsMetas[0];
      const allowedData =
        isAfter(startOfMonth(ref), startOfMonth(new Date())) ||
        isEqual(startOfMonth(ref), startOfMonth(new Date()));

      if (
        (!hasPermission(req, ["MASTER", "METAS:METAS_EDITAR"]) &&
          !filiaisGestor.includes(meta.id_filial)) ||
        (filiaisGestor.includes(meta.id_filial) && !allowedData)
      ) {
        throw new Error("Sem permissão para edição dessa meta");
      }

      await conn.execute(
        `UPDATE metas SET
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
          startOfMonth(ref),
          startOfMonth(ciclo),
          startOfDay(data_inicial),
          startOfDay(data_final),
          proporcional,

          nome,
          normalizeNumberOnly(cpf),
          id_filial,
          filial,
          grupo_economico,
          cargo,
          tags || null,

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
