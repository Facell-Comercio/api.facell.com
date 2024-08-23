const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const updateSaldo = require("./updateSaldo");

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

      const [rowDeposito] = await conn.execute(`SELECT id, id_caixa FROM datasys_caixas_depositos WHERE id = ?`,[id])
      const deposito = rowDeposito && rowDeposito[0];
      if(!deposito){
        throw new Error('Depósito não localizado!')
      }
      await conn.execute(`DELETE FROM datasys_caixas_depositos WHERE id = ?`, [
        id,
      ]);
      await updateSaldo({conn, id_caixa: deposito.id_caixa})

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
