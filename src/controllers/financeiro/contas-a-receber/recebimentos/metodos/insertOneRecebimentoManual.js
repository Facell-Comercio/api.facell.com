const { startOfDay } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const updateSaldoContaBancaria = require("../../../tesouraria/metodos/updateSaldoContaBancaria");
const crypto = require("crypto");
const {
  objectToStringLine,
  normalizeDate,
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeNumberFixed,
  normalizeNumberOnly,
} = require("../../../../../helpers/mask");
const updateValorVencimento = require("../../titulo-receber/metodos/updateValorVencimento");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { user } = req;
      const { id_conta_bancaria, data, valor, id_vencimento } = req.body || {};

      conn = await db.getConnection();
      await conn.beginTransaction();

      // ^ Validações
      // Titulo
      if (!id_conta_bancaria) {
        throw new Error("Conta bancária não informada!");
      }
      if (!valor) {
        throw new Error("Valor não informado!");
      }
      if (valor && parseFloat(valor) < 0) {
        throw new Error("Valor não pode ser negativo!");
      }
      if (!data) {
        throw new Error("Data do recebimento não informada!");
      }

      if (!id_vencimento) {
        throw new Error("Vencimento não informado!");
      }

      //* Consulta o vencimento e os recebimentos relacionados a ele
      const [rowVencimento] = await conn.execute(
        `SELECT tv.valor as valor_vencimento, t.descricao as descricao_titulo,
        tv.valor_pago, tv.data_vencimento, t.id as id_titulo
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        WHERE tv.id = ?`,
        [id_vencimento]
      );
      const vencimento = rowVencimento && rowVencimento[0];
      const { valor_vencimento, descricao_titulo, valor_pago, data_vencimento, id_titulo } =
        vencimento;

      const [recebimentos] = await conn.execute(
        `SELECT tr.valor
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos_recebimentos tr ON tr.id_vencimento = tv.id
        WHERE tv.id = ?`,
        [id_vencimento]
      );
      const valor_recebimentos = recebimentos?.reduce(
        (acc, curr) => acc + parseFloat(curr.valor),
        0
      );
      //* Valida se o valor dos recebimentos diverge 0.06+ o valor do vencimento
      if (
        parseFloat((valor_recebimentos + parseFloat(valor)).toFixed(2)) -
        parseFloat(parseFloat(valor_vencimento).toFixed(2)) > 0.06
      ) {
        throw new Error(
          `Valor de recebimento ultrapassa o permitido, valor máximo a ser recebido R$${
            valor_vencimento - valor_pago
          }`
        );
      }

      //* Obtém os dados da conta bancária
      const [rowContaBancaria] = await conn.execute(
        "SELECT caixa FROM fin_contas_bancarias WHERE id = ?",
        [id_conta_bancaria]
      );
      const contaBancaria = rowContaBancaria && rowContaBancaria[0];

      let id_extrato = null;
      //* Se for uma tesouraria realiza os procedimentos abaixo
      if (contaBancaria.caixa) {
        let descricao = `RECEBIMENTO #${id_vencimento} - ${descricao_titulo}`;
        // * Verifica se já existe um extrato com a mesma descrição:
        const [extratosRepetidos] = await conn.execute(
          "SELECT descricao FROM fin_extratos_bancarios WHERE descricao LIKE CONCAT(?,'%') ORDER BY created_at DESC",
          [descricao]
        );

        if (extratosRepetidos.length > 0) {
          const lastExtratoRepetido = extratosRepetidos && extratosRepetidos[0];
          const lastIndex = lastExtratoRepetido.descricao.match(/\((\d+)\)$/);

          const normalizedIndex = parseInt(normalizeNumberOnly(lastIndex ? lastIndex[0] : "0"));

          descricao += ` (${normalizedIndex ? normalizedIndex + 1 : 1})`;
        }

        const hashEntrada = crypto
          .createHash("md5")
          .update(
            objectToStringLine({
              id_conta_bancaria,
              valor: valor,
              data_deposito: data,
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
            startOfDay(data),
            "CREDIT",
            valor,
            descricao,
            user.id,
          ]
        );

        await updateSaldoContaBancaria({
          body: {
            id_conta_bancaria,
            valor,
            conn,
          },
        });
        id_extrato = result.insertId;
      }

      //* Pagamento Vencimento
      await updateValorVencimento({
        body: {
          id: id_vencimento,
          valor: valor,
          conn_externa: conn,
        },
      });

      // * Criação do Recebimento
      await conn.execute(
        `INSERT INTO fin_cr_titulos_recebimentos
          (id_vencimento, id_conta_bancaria, data, valor, id_user, id_extrato)
          VALUES (?,?,?,?,?,?)
          `,
        [id_vencimento, id_conta_bancaria, startOfDay(data), valor, user.id, id_extrato]
      );

      //* Adição de histórico no título
      let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}\n`;
      historico += `ADICIONADO ${normalizeCurrency(valor)} NO VENCIMENTO DE DATA ${normalizeDate(
        data_vencimento
      )}\n`;

      await conn.execute(
        `INSERT INTO fin_cr_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
        [id_titulo, historico]
      );

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "INSERT_ONE_RECEBIMENTO",
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
