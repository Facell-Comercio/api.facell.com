const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const crypto = require("crypto");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");
const { objectToStringLine } = require("../../../../helpers/mask");

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
        "SELECT saldo, descricao, caixa FROM fin_contas_bancarias WHERE id = ?",
        [id_caixa_saida]
      );
      const contaSaida = rowContaSaida && rowContaSaida[0];
      const [rowContaEntrada] = await conn.execute(
        "SELECT saldo, descricao, caixa FROM fin_contas_bancarias WHERE id = ?",
        [id_caixa_entrada]
      );
      const contaEntrada = rowContaEntrada && rowContaEntrada[0];

      //* SAÍDA
      if (contaSaida.caixa) {
        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria: id_caixa_saida,
            valor: -valor_transferir,
            conn,
          },
        });

        const descricaoSaida = `TRANSFERENCIA - ${contaEntrada.descricao}`;
        const hashSaida = crypto
          .createHash("md5")
          .update(
            objectToStringLine({
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
      }

      //* ENTRADA
      if (contaEntrada.caixa) {
        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria: id_caixa_entrada,
            valor: valor_transferir,
            conn,
          },
        });

        const descricaoEntrada = `TRANSFERENCIA - ${contaSaida.descricao}`;
        const hashEntrada = crypto
          .createHash("md5")
          .update(
            objectToStringLine({
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
      }

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
