const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { isBefore, format } = require("date-fns");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id_conta_bancaria, data_fechamento } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID da conta de saída não informado!");
      }
      if (!data_fechamento) {
        throw new Error("Data de fechamento não informada!");
      }

      conn = await db.getConnection();

      const [rowContaBancaria] = await conn.execute(
        "SELECT data_fechamento FROM fin_contas_bancarias WHERE id = ?",
        [id_conta_bancaria]
      );
      const contaBancaria = rowContaBancaria && rowContaBancaria[0];
      if (isBefore(data_fechamento, contaBancaria.data_fechamento)) {
        throw new Error(
          "A data de fechamento não pode ser anterior à data de fechamento atual da conta!"
        );
      }
      await conn.execute("UPDATE fin_contas_bancarias SET data_fechamento = ? WHERE id = ?", [
        format(data_fechamento, "yyyy-MM-dd"),
        id_conta_bancaria,
      ]);

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "UPDATE_DATA_FECHAMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
