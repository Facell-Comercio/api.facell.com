const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const crypto = require("crypto");
const { formatDate } = require("../../../../services/boleto/helper/formatters");

function objectToString(object) {
  return Object.values(object).reduce((acc, value) => {
    if (value instanceof Date) {
      value = formatDate(value, "yyyyMMdd");
    }
    return acc + (value !== null && value !== undefined ? String(value) : "");
  }, "");
}
module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id_caixa_saida, id_caixa_entrada, valor_transferir } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_caixa_entrada) {
        throw new Error("ID da conta de entrada não informado!");
      }
      if (!id_caixa_saida) {
        throw new Error("ID da conta de saída não informado!");
      }
      if (!valor_transferir) {
        throw new Error("Valor da transferência não informado!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const data_hoje = new Date();

      const [rowContaSaida] = await conn.execute(
        "SELECT saldo, descricao FROM fin_contas_bancarias WHERE id = ?",
        [id_caixa_saida]
      );
      const contaSaida = rowContaSaida && rowContaSaida[0];
      if (parseFloat(contaSaida.saldo) - parseFloat(valor_transferir) < 0) {
        throw new Error("Transferência inválida, saldo insuficiente");
      }
      const [rowContaEntrada] = await conn.execute(
        "SELECT saldo, descricao FROM fin_contas_bancarias WHERE id = ?",
        [id_caixa_entrada]
      );
      const contaEntrada = rowContaEntrada && rowContaEntrada[0];

      //* SAÍDA
      await conn.execute(
        "UPDATE fin_contas_bancarias SET saldo = saldo - ?, data_saldo = ? WHERE id = ?",
        [valor_transferir, data_hoje, id_caixa_saida]
      );
      const descricaoSaida = `TRANSFERENCIA - ${contaEntrada.descricao}`;
      const hashSaida = crypto
        .createHash("md5")
        .update(
          objectToString({
            id_caixa_saida,
            valor_transferir,
            data_transferir: data_hoje,
            id_user: user.id,
            tipo_transacao: "DEBIT",
            descricaoSaida,
          })
        )
        .digest("hex");

      await conn.execute(
        `INSERT INTO fin_extratos_bancarios
        (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user)
        VALUES(?,?,?,?,?,?,?,?)`,
        [
          id_caixa_saida,
          hashSaida,
          hashSaida,
          data_hoje,
          "DEBIT",
          -valor_transferir,
          descricaoSaida,
          user.id,
        ]
      );

      //* ENTRADA
      await conn.execute(
        "UPDATE fin_contas_bancarias SET saldo = saldo + ?, data_saldo = ? WHERE id = ?",
        [valor_transferir, data_hoje, id_caixa_entrada]
      );
      const descricaoEntrada = `TRANSFERENCIA - ${contaSaida.descricao}`;
      const hashEntrada = crypto
        .createHash("md5")
        .update(
          objectToString({
            id_caixa_entrada,
            valor_transferir,
            data_transferir: data_hoje,
            id_user: user.id,
            tipo_transacao: "CREDIT",
            descricaoEntrada,
          })
        )
        .digest("hex");

      await conn.execute(
        `INSERT INTO fin_extratos_bancarios
        (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user)
        VALUES(?,?,?,?,?,?,?,?)`,
        [
          id_caixa_entrada,
          hashEntrada,
          hashEntrada,
          data_hoje,
          "CREDIT",
          valor_transferir,
          descricaoEntrada,
          user.id,
        ]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "TRANSFERIR_SALDO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};