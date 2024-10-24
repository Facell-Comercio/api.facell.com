const { startOfDay } = require("date-fns");
const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const {
  normalizeNumberFixed,
  normalizeFirstAndLastName,
  normalizeCurrency,
  normalizeDate,
} = require("../../../../../helpers/mask");
const updateValorVencimento = require("../../titulo-receber/metodos/updateValorVencimento");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { user } = req;
      const { id_conta_bancaria, id_extrato, vencimentos } = req.body || {};

      conn = await db.getConnection();
      await conn.beginTransaction();

      // ^ Validações
      // Titulo
      if (!id_conta_bancaria) {
        throw new Error("Conta bancária não informada!");
      }

      const [rowTransacoes] = await conn.execute(
        "SELECT * FROM fin_extratos_bancarios WHERE id = ?",
        [id_extrato]
      );
      const transacao = rowTransacoes && rowTransacoes[0];

      const totalUpdateValorVencimentos = vencimentos.reduce(
        (acc, vencimento) => acc + parseFloat(vencimento.valor_pagar),
        0
      );

      if (
        normalizeNumberFixed(totalUpdateValorVencimentos, 2) >
        normalizeNumberFixed(transacao.valor, 2)
      ) {
        throw new Error("Valor total dos vencimentos não pode ser maior que o valor da transação!");
      }

      for (const vencimento of vencimentos) {
        const { id_vencimento, valor_pagar } = vencimento;

        //* Consulta o vencimento e os recebimentos relacionados a ele
        const [rowVencimento] = await conn.execute(
          `SELECT tv.valor as valor_vencimento, t.descricao as descricao_titulo,
          tv.valor_pago, t.id as id_titulo, tv.data_vencimento
          FROM fin_cr_titulos_vencimentos tv
          LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
          WHERE tv.id = ?`,
          [vencimento.id_vencimento]
        );
        const vencimento_database = rowVencimento && rowVencimento[0];
        const { valor_vencimento, valor_pago, id_titulo, data_vencimento } = vencimento_database;

        const [recebimentos] = await conn.execute(
          `SELECT tr.valor
          FROM fin_cr_titulos_vencimentos tv
          LEFT JOIN fin_cr_titulos_recebimentos tr ON tr.id_vencimento = tv.id
          WHERE tv.id = ?`,
          [vencimento.id_vencimento]
        );
        const valor_recebimentos = recebimentos?.reduce(
          (acc, curr) => acc + parseFloat(curr.valor),
          0
        );

        //* Valida se o valor dos recebimentos não ultrapassa o valor do vencimento
        if (
          normalizeNumberFixed(valor_recebimentos + parseFloat(valor_pagar), 2) >
          normalizeNumberFixed(valor_vencimento, 2)
        ) {
          throw new Error(
            `No vencimento de id ${id_vencimento} o valor está acima do permitido! O valor máximo para esse recebimento é de R$${
              valor_vencimento - valor_pago
            }`
          );
        }
        //* Pagamento Vencimento
        await updateValorVencimento({
          body: {
            id: id_vencimento,
            valor: valor_pagar,
            conn_externa: conn,
          },
        });

        // * Criação do Recebimento
        await conn.execute(
          `INSERT INTO fin_cr_titulos_recebimentos
            (id_vencimento, id_conta_bancaria, data, valor, id_user, id_extrato)
            VALUES (?,?,?,?,?,?)
            `,
          [
            id_vencimento,
            id_conta_bancaria,
            startOfDay(transacao.data_transacao),
            valor_pagar,
            user.id,
            transacao.id,
          ]
        );

        //* Adição de histórico no título
        let historico = `EDITADO POR: ${normalizeFirstAndLastName(user.nome)}\n`;
        historico += `ADICIONADO ${normalizeCurrency(
          valor_pagar
        )} NO VENCIMENTO DE DATA ${normalizeDate(data_vencimento)}\n`;

        await conn.execute(
          `INSERT INTO fin_cr_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
          [id_titulo, historico]
        );
      }

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "INSERT_ONE_RECEBIMENTOS_CONTA_BANCARIAS",
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
