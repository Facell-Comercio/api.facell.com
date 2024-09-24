const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getAllCaixasComSaldo = require("./getAllCaixasComSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const id_receptor = req.query.id_receptor;

    let conn;
    try {
      if (!id_receptor) {
        throw new Error("ID do Receptor não informado!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        `DELETE FROM datasys_caixas_receptores_boletos WHERE id = ?`,
        [id_receptor]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "DELETE_RECEPTOR_BOLETOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
