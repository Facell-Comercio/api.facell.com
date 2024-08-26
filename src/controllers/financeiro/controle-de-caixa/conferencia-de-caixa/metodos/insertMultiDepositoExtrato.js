const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const insertOneDeposito = require("./insertOneDeposito");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { extratos, id_caixa } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      for (const extrato of extratos) {
        if (!id_caixa) {
          throw new Error("É necessário informar o caixa!");
        }
        if (
          !(
            extrato.id_conta_bancaria &&
            extrato.valor &&
            extrato.documento &&
            extrato.data_transacao
          )
        ) {
          throw new Error("Todos os campos são obrigatórios!");
        }
        const { id } = await insertOneDeposito({
          body: {
            id_caixa,
            id_conta_bancaria: extrato.id_conta_bancaria,
            valor: extrato.valor,
            comprovante: extrato.documento,
            data_deposito: extrato.data_transacao,
            conn,
          },
        });
        await conn.execute(
          `
          UPDATE fin_extratos_bancarios SET id_deposito_caixa = ? WHERE id = ?
          `,
          [id, extrato.id]
        );
      }

      // await conn.commit();
      await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_MULTI_DEPOSITO_EXTRATO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
