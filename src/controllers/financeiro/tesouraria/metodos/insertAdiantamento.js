const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const crypto = require("crypto");
const { formatDate } = require("../../../../services/boleto/helper/formatters");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");
const { objectToStringLine } = require("../../../../helpers/mask");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id_conta_bancaria, valor, descricao } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_conta_bancaria) {
        throw new Error("ID da conta de saída não informado!");
      }
      if (!valor) {
        throw new Error("Valor do adiantamento não informado!");
      }
      if (!descricao) {
        throw new Error("Descrição do adiantamento não informada!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const data_hoje = new Date();

      const [rowContaBancaria] = await conn.execute(
        "SELECT saldo, descricao FROM fin_contas_bancarias WHERE id = ?",
        [id_conta_bancaria]
      );
      const contaBancaria = rowContaBancaria && rowContaBancaria[0];

      if (parseFloat(contaBancaria.saldo) - parseFloat(valor) < 0) {
        throw new Error("Adiantamento recusado, saldo insuficiente");
      }

      //* SAÍDA
      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: -valor,
          conn_externa: conn,
        },
      });

      const hashSaida = crypto
        .createHash("md5")
        .update(
          objectToStringLine({
            id_conta_bancaria,
            valor,
            data_transferir: data_hoje,
            id_user: user.id,
            tipo_transacao: "DEBIT",
            descricao,
          })
        )
        .digest("hex");

      await conn.execute(
        `INSERT INTO fin_extratos_bancarios
        (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user, adiantamento)
        VALUES(?,?,?,?,?,?,?,?,?)`,
        [
          id_conta_bancaria,
          hashSaida,
          hashSaida,
          data_hoje,
          "DEBIT",
          -valor,
          descricao.toUpperCase(),
          user.id,
          true,
        ]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "INSERT_ADIANTAMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
