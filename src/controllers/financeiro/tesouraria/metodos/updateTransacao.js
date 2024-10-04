const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { descricao, valor, id } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID do extrato não informado!");
      }
      if (!descricao) {
        throw new Error("Descrição não informada!");
      }
      if (!valor) {
        throw new Error("Valor não informado!");
      }

      console.log("UPDATE", { id, descricao, valor });

      // await conn.execute(
      //   "UPDATE FROM fin_extratos_bancarios descricao = ?, valor = ? WHERE id = ?",
      //   [descricao, valor, id_extrato]
      // );

      //! ATUALIZAR SALDO DA CONTA

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "UPDATE_TRANSACAO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
