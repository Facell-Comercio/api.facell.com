const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { filters } = req.query;

      const { id_conta_bancaria, id_matriz } = filters || {};

      const [transacoes] = await conn.execute(
        `
        SELECT eb.*, eb.documento as doc
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_cr_titulos_recebimentos tr ON tr.id_extrato = eb.id
        WHERE eb.id_conta_bancaria = ?
        AND eb.id_deposito_caixa IS NULL
        AND NOT eb.adiantamento = 1
        AND NOT eb.suprimento = 1
        AND eb.tipo_transacao = "CREDIT"
        AND tr.id IS NULL
        ORDER BY eb.data_transacao DESC
        `,
        [id_conta_bancaria]
      );
      const [vencimentos] = await conn.execute(
        `
        SELECT tv.*, (tv.valor - tv.valor_pago) as valor, t.descricao,
        tv.id as id_vencimento, tv.data_vencimento as data, 0 as valor_pagar
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        WHERE f.id_matriz = ?
        AND tv.valor <> tv.valor_pago
        ORDER BY tv.data_vencimento DESC
        `,
        [id_matriz]
      );

      const objResponse = {
        transacoes,
        vencimentos,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RECEBIMENTOS",
        method: "GET_ALL_TRANSACOES_AND_VENCIMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
