const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const crypto = require("crypto");
const { startOfDay, formatDate } = require("date-fns");
const updateSaldo = require("./updateSaldo");
const { objectToStringLine } = require("../../../../../helpers/mask");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, id_caixa, id_conta_bancaria, valor, comprovante, data_deposito, conn_recebida } =
      req.body;

    const { user } = req;

    let conn;
    try {
      conn = conn_recebida || (await db.getConnection());
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

      const [rowsContaBancaria] = await conn.execute(
        "SELECT id, caixa FROM fin_contas_bancarias WHERE id = ?",
        [id_conta_bancaria]
      );
      const contaBancaria = rowsContaBancaria && rowsContaBancaria[0];

      const [rowsCaixas] = await conn.execute(
        `
        SELECT dc.id, dc.status, dc.data, f.nome as filial 
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        WHERE dc.id = ?
        `,
        [id_caixa]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      if (caixa.status === "CONFIRMADO") {
        throw new Error("Não poder ser inseridos depósitos nesse caixa");
      }

      let id_transacao_criada = null;
      //* SE FOR UMA CONTA CAIXA
      if (contaBancaria.caixa) {
        const descricao = `DEPOSITO - CAIXA: ${caixa.filial} - ${formatDate(
          caixa.data,
          "dd/MM/yyyy"
        )}`;
        const hashEntrada = crypto
          .createHash("md5")
          .update(
            objectToStringLine({
              id_conta_bancaria,
              valor,
              data_deposito: caixa.data,
              id_user: user.id,
              tipo_transacao: "CREDIT",
              descricao,
            })
          )
          .digest("hex");
        const [result] = await conn.execute(
          `INSERT INTO fin_extratos_bancarios
          (id_conta_bancaria, id_transacao, documento, data_transacao, tipo_transacao, valor, descricao, id_user)
          VALUES(?,?,?,?,?,?,?,?)`,
          [
            id_conta_bancaria,
            hashEntrada,
            hashEntrada,
            caixa.data,
            "CREDIT",
            valor,
            descricao,
            user.id,
          ]
        );
        id_transacao_criada = result.insertId;

        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria,
            valor: valor,
            conn_externa: conn,
          },
        });
      }

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_depositos (id_caixa, id_conta_bancaria, data_deposito, comprovante, valor, id_transacao_criada) VALUES (?,?,?,?,?,?);`,
        [
          id_caixa,
          id_conta_bancaria,
          startOfDay(data_deposito),
          comprovante,
          parseFloat(valor),
          id_transacao_criada,
        ]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir o depósito!");
      }

      await updateSaldo({ conn, id_caixa });

      if (!conn_recebida) {
        await conn.commit();
      }
      resolve({ id: newId });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_DEPOSITO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
