const {
  logger,
} = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const desfazerAjuste = require("./desfazerAjuste");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id } = req.params;

    let conn;
    try {
      if (!id) {
        throw new Error("ID não informado");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      await desfazerAjuste({
        conn,
        id_ajuste: id,
      });
      await conn.execute(
        `DELETE FROM datasys_caixas_ajustes WHERE id = ?`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "DELETE_AJUSTE",
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
