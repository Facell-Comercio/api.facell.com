const { format } = require("date-fns");
const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { filter } = require("jszip");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    try {
      // Filtros
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const { termo, data_transacao, valor, id_matriz } = filters || {};
      let where = ` WHERE 1=1 `;
      const params = [];

      if (!data_transacao) {
        throw new Error("Sem data de transação");
      }
      if (!valor) {
        throw new Error("Valor não informado");
      }
      if (!id_matriz) {
        throw new Error("ID da matriz não informado");
      }

      if (termo) {
        where += ` AND (eb.descricao LIKE CONCAT('%',?,'%')
                      OR eb.documento LIKE CONCAT('%',?,'%')) `;
        params.push(termo, termo);
      }
      if (data_transacao) {
        where += ` AND eb.data_transacao = ? `;
        params.push(format(data_transacao, "yyyy-MM-dd"));
      }
      if (valor) {
        where += ` AND eb.valor = ? `;
        params.push(valor);
      }
      if (id_matriz) {
        where += ` AND cb.id_filial =? `;
        params.push(id_matriz);
      }
      conn = await db.getConnection();

      const [rowsExtratos] = await conn.execute(
        `
        SELECT
            COUNT(eb.id) as total
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        LEFT JOIN fin_conciliacao_bancaria_itens cbi
          ON cbi.id_item = eb.id AND cbi.tipo = "transacao"
        ${where}
        AND cbi.id IS NULL
        AND eb.id_duplicidade
        AND tipo_transacao = "DEBIT"
      `,
        params
      );
      const totalExtratos = (rowsExtratos && rowsExtratos[0]["total"]) || 0;

      const offset = pageIndex * pageSize;

      params.push(pageSize);
      params.push(offset);

      const [extratos] = await conn.execute(
        `
        SELECT
            eb.id, eb.documento, eb.descricao, ABS(eb.valor) as valor, eb.data_transacao,
            cb.descricao as conta_bancaria
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        LEFT JOIN fin_conciliacao_bancaria_itens cbi
          ON cbi.id_item = eb.id AND cbi.tipo = "transacao"
        ${where}
        AND cbi.id IS NULL
        AND eb.id_duplicidade IS NULL
        AND tipo_transacao = "DEBIT"
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `,
        params
      );

      const objResponse = {
        rows: extratos,
        pageCount: Math.ceil(totalExtratos / pageSize),
        rowCount: totalExtratos,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONCILIACAO_BANCARIA_CR",
        method: "GET_EXTRATOS_DEBIT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
