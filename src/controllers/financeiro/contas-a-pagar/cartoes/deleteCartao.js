const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function deleteCartao(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }

      await conn.beginTransaction();
      const [compras] = await conn.execute(
        `SELECT id
            FROM fin_cp_titulos
            WHERE id_cartao = ?`,
        [id]
      );

      if (compras && compras.length > 0) {
        throw new Error("Este cartão possui compras associadas");
      }

      await conn.execute(
        `DELETE FROM fin_cartoes_corporativos WHERE id = ? LIMIT 1`,
        [id]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "DELETE_CARTAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
