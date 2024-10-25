const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { filters_extratos_bancarios, filters_vencimentos, id_conta_bancaria, id_matriz } =
        req.query;

      if (!id_conta_bancaria) {
        throw new Error("ID da conta bancária não informado!");
      }
      if (!id_matriz) {
        throw new Error("ID da matriz não informado!");
      }

      const { descricao, range_data } = filters_extratos_bancarios || {};
      const { descricao_titulo, range_data_vencimento, id_fornecedor, num_doc, id_vencimento } =
        filters_vencimentos || {};

      let whereTransacoes = " WHERE 1=1 ";
      const paramsTransacoes = [];
      if (id_conta_bancaria) {
        whereTransacoes += ` AND eb.id_conta_bancaria = ? `;
        paramsTransacoes.push(id_conta_bancaria);
      }

      if (descricao) {
        whereTransacoes += ` AND eb.descricao LIKE CONCAT('%',?,'%') `;
        paramsTransacoes.push(descricao);
      }
      if (range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          whereTransacoes += ` AND eb.data_transacao BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            whereTransacoes += ` eb.data_transacao = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            whereTransacoes += ` eb.data_transacao = '${data_ate.split("T")[0]}' `;
          }
        }
      }

      let whereVencimentos = " WHERE 1=1 ";
      const paramsVencimentos = [];
      if (id_matriz) {
        whereVencimentos += ` AND f.id_matriz =? `;
        paramsVencimentos.push(id_matriz);
      }
      if (id_vencimento) {
        whereVencimentos += ` AND tv.id =? `;
        paramsVencimentos.push(id_vencimento);
      }
      if (descricao_titulo) {
        whereVencimentos += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
        paramsVencimentos.push(descricao_titulo);
      }
      if (range_data_vencimento) {
        const { from: data_de, to: data_ate } = range_data_vencimento;
        if (data_de && data_ate) {
          whereVencimentos += ` AND tv.data_vencimento BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            whereVencimentos += ` tv.data_vencimento = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            whereVencimentos += ` tv.data_vencimento = '${data_ate.split("T")[0]}' `;
          }
        }
      }
      if (id_fornecedor) {
        whereVencimentos += ` AND t.id_fornecedor = ? `;
        paramsVencimentos.push(id_fornecedor);
      }
      if (num_doc) {
        whereVencimentos += ` AND t.num_doc LIKE CONCAT('%',?) `;
        paramsVencimentos.push(num_doc);
      }

      const queryTransacoes = `
        SELECT 
          eb.*,
          eb.documento AS doc,
          (
            eb.valor - (SELECT COALESCE(SUM(tr.valor), 0)
            FROM fin_cr_titulos_recebimentos tr
            WHERE tr.id_extrato = eb.id
            )
          ) AS valor_em_aberto
        FROM fin_extratos_bancarios eb
        ${whereTransacoes}
        AND eb.id_deposito_caixa IS NULL
        AND NOT eb.adiantamento = 1
        AND NOT eb.suprimento = 1
        AND eb.tipo_transacao = "CREDIT"
        AND (
            eb.valor - (SELECT COALESCE(SUM(tr.valor), 0)
            FROM fin_cr_titulos_recebimentos tr
            WHERE tr.id_extrato = eb.id
            )
          ) > 0
        ORDER BY eb.data_transacao DESC
        `;
      const [transacoes] = await conn.execute(queryTransacoes, paramsTransacoes);

      const queryVencimentos = `
        SELECT tv.*, (tv.valor - tv.valor_pago) as valor, t.descricao,
        tv.id as id_vencimento, tv.data_vencimento as data, 0 as valor_pagar
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN filiais f ON f.id = t.id_filial
        ${whereVencimentos}
        AND ROUND(tv.valor,2) <> ROUND(tv.valor_pago,2)
        AND t.id_status >= 30
        AND t.id_status <=40
        ORDER BY tv.data_vencimento DESC
        `;
      const [vencimentos] = await conn.execute(queryVencimentos, paramsVencimentos);

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
