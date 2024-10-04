const { logger } = require("../../../../../logger");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { conn, valor, id_conta_bancaria } = req.body;

    try {
      //* VALIDAÇÃO DE SALDO NO CASO DE RETIRADA
      if (valor < 0) {
        const [rowsContaBancaria] = await conn.execute(
          "SELECT saldo FROM fin_contas_bancarias WHERE id = ?",
          [id_conta_bancaria]
        );
        const contaBancaria = rowsContaBancaria && rowsContaBancaria[0];
        if (parseFloat(contaBancaria.saldo) < Math.abs(parseFloat(String(valor)))) {
          throw new Error("Saldo insuficiente na tesouraria");
        }
      }

      await conn.execute(
        `
        UPDATE fin_contas_bancarias
        SET saldo = saldo + ?,
        data_saldo = NOW()
        WHERE id = ?`,
        [valor, id_conta_bancaria]
      );
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "UPDATE_SALDO_CONTA_BANCARIA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};
