const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const { checkCPF } = require("../../../helpers/chekers");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      data_inicio_cobranca,
      nome_colaborador,
      cpf_colaborador,
      id_filial,
      origem,
      parcelas,
      parcela,
      valor_parcela,
      saldo,
      obs,
    } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const intParcela = parseInt(parcela);
    const intParcelas = parseInt(parcelas);
    const floatValorParcela = parseFloat(valor_parcela);
    const floatSaldo = parseFloat(saldo);
    let conn;
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (
        !data_inicio_cobranca ||
        !id_filial ||
        !origem ||
        !parcelas ||
        !parcela ||
        !valor_parcela ||
        !saldo ||
        !obs
      ) {
        throw new Error("Dados insuficientes!");
      }
      if (intParcelas === intParcela && floatValorParcela !== floatSaldo) {
        throw new Error("O valor da parcela não pode ser diferente do saldo!");
      }
      if (floatValorParcela > floatSaldo) {
        throw new Error("Valor da parcela não pode ser maior que o saldo!");
      }
      if (intParcela > intParcelas) {
        throw new Error(
          "A parcela não pode ser maior que a quantidade de parcelas"
        );
      }
      if (!checkCPF(cpf_colaborador)) {
        throw new Error("CPF inválido!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO vales (
          data_inicio_cobranca,
          nome_colaborador,
          cpf_colaborador,
          id_filial,
          origem,
          parcelas,
          parcela,
          valor,
          saldo,
          obs,
          id_criador
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?)`,
        [
          startOfDay(data_inicio_cobranca),
          nome_colaborador,
          cpf_colaborador,
          id_filial,
          origem,
          intParcelas,
          intParcela,
          floatValorParcela,
          floatSaldo,
          obs,
          user.id,
        ]
      );

      const newId = result.insertId;

      if (!newId) {
        throw new Error(`Vale não inserido`);
      }

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "INSERT_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
