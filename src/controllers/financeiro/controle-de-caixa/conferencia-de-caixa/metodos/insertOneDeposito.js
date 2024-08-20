const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_caixa,
      id_conta_bancaria,
      valor,
      comprovante,
      data_deposito,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_caixa) {
        throw new Error("É necessário informar o caixa!");
      }
      if (!(id_conta_bancaria && valor && comprovante && data_deposito)) {
        throw new Error("Todos os campos são obrigatórios!");
      }
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_depositos (id_caixa, id_conta_bancaria, data_deposito, comprovante, valor) VALUES (?,?,?,?,?);`,
        [
          id_caixa,
          id_conta_bancaria,
          startOfDay(data_deposito),
          comprovante,
          parseFloat(valor),
        ]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o rateio!");
      }

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_DEPOSITO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
