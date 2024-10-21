const { format } = require("date-fns");
const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    // user.perfil = 'Financeiro'
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };
    const { termo, data_transacao, valor } = filters || {};
    let where = ` WHERE 1=1 `;
    const params = [];

    if (termo) {
      where += ` AND (descricao LIKE CONCAT('%',?,'%')
                    OR documento LIKE CONCAT('%',?,'%')) `;
      params.push(termo, termo);
    }

    if (data_transacao) {
      where += ` AND data_transacao = ? `;
      params.push(format(data_transacao, "yyyy-MM-dd"));
    }

    if (valor) {
      where += ` AND valor = ? `;
      params.push(valor);
    }

    let conn;

    try {
      conn = await db.getConnection();

      const [rowsExtratos] = await conn.execute(
        `
        SELECT
            COUNT(eb.id) as total
        FROM fin_extratos_bancarios eb
        LEFT JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        ${where}
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
        ${where}
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
