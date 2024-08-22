const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

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

      const [rowsDepositosCaixa] = await conn.execute(
        "SELECT valor, id_caixa FROM datasys_caixas_depositos WHERE id = ?",
        [id]
      );
      const deposito = rowsDepositosCaixa && rowsDepositosCaixa[0];
      await conn.execute(
        "UPDATE datasys_caixas SET saldo = saldo + ? WHERE id = ?",
        [parseFloat(deposito.valor).toFixed(2), deposito.id_caixa]
      );

      await conn.execute(`DELETE FROM datasys_caixas_depositos WHERE id = ?`, [
        id,
      ]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "DELETE_DEPOSITO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
