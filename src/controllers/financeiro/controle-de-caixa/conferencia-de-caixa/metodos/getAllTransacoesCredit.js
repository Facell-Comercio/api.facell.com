const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { filters, pagination } = req.query;
    const { pageIndex, pageSize } = pagination || {
      pageIndex: 0,
      pageSize: 15,
    };

    const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

    const { data_transacao, id_matriz } = filters || {};

    const params = [data_transacao, id_matriz];

    let conn;
    try {
      conn = await db.getConnection();
      if (!(data_transacao && id_matriz)) {
        throw new Error("Dados insuficientes!");
      }

      const [rowsTransacoes] = await conn.execute(
        ` 
          SELECT COUNT(*) AS total
          FROM (
            SELECT eb.id FROM fin_extratos_bancarios eb
            INNER JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
            INNER JOIN filiais f ON f.id = cb.id_filial
            LEFT JOIN datasys_caixas_depositos cd ON cd.id = eb.id_deposito_caixa
            WHERE 
              eb.tipo_transacao = 'CREDIT' 
              AND eb.descricao LIKE '%DEP%' 
              AND eb.data_transacao >= ?
              AND f.id_matriz = ?
          ) AS subconsulta
          `,
        params
      );
      const totalTransacoes =
        (rowsTransacoes && rowsTransacoes[0]["total"]) || 0;
      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }

      const [caixas] = await conn.execute(
        `
        SELECT eb.*, cb.descricao as conta_bancaria, cd.id_caixa
        FROM fin_extratos_bancarios eb
        INNER JOIN fin_contas_bancarias cb ON cb.id = eb.id_conta_bancaria
        INNER JOIN filiais f ON f.id = cb.id_filial
        LEFT JOIN datasys_caixas_depositos cd ON cd.id = eb.id_deposito_caixa
        WHERE 
	        eb.tipo_transacao = 'CREDIT' 
	        AND eb.descricao LIKE '%DEP%' 
	        AND eb.data_transacao >= ?
	        AND f.id_matriz = ?
        ${limit}
        `,
        params
      );

      const objResponse = {
        rows: caixas,
        pageCount: Math.ceil(totalTransacoes / pageSize),
        rowCount: totalTransacoes,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ALL_TRANSACOES_CREDIT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
