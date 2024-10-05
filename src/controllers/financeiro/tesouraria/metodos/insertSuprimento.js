const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const crypto = require("crypto");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");
const { objectToStringLine, normalizeFirstAndLastName } = require("../../../../helpers/mask");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id, id_conta_bancaria, valor, descricao } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!id_conta_bancaria) {
        throw new Error("ID da conta de saída não informado!");
      }
      if (!valor) {
        throw new Error("Valor do depósito não informado!");
      }
      if (!descricao) {
        throw new Error("Descrição do depósito não informada!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const data_hoje = new Date();

      //* ENTRADA
      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: valor,
          conn,
        },
      });

      const descricaoSuprimento = `SUPRIMENTO - ${descricao} - POR: ${normalizeFirstAndLastName(
        user.nome
      )}`;

      const hashSaida = crypto
        .createHash("md5")
        .update(
          objectToStringLine({
            id_conta_bancaria,
            valor,
            data_transferir: data_hoje,
            id_user: user.id,
            tipo_transacao: "CREDIT",
            descricao: descricaoSuprimento,
            suprimento: true,
          })
        )
        .digest("hex");

      await conn.execute(
        `INSERT INTO fin_extratos_bancarios
        (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user, suprimento)
        VALUES(?,?,?,?,?,?,?,?,?)`,
        [
          id_conta_bancaria,
          hashSaida,
          hashSaida,
          data_hoje,
          "CREDIT",
          valor,
          descricaoSuprimento.toUpperCase(),
          user.id,
          true,
        ]
      );

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "INSERT_SUPRIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
