const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/formaters");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { filters, pagination } = req.query;
      const { pageIndex, pageSize } = pagination || {
        pageIndex: 0,
        pageSize: 15,
      };
      const offset = pageIndex > 0 ? pageSize * pageIndex : 0;

      let where = ` WHERE 1=1 `;
      const params = [];
      const {
        id_titulo,
        id_vencimento,
        id_matriz,
        filiais_list,
        id_conta_bancaria,
        fornecedor,
        descricao,
        num_doc,
        range_data,
        id_status,
        minStatusTitulo,
        status_vencimento_list,
      } = filters || {};

      if (id_titulo) {
        where += ` AND t.id =? `;
        params.push(id_titulo);
      }
      if (id_vencimento) {
        where += ` AND tv.id =? `;
        params.push(id_vencimento);
      }
      if (id_matriz && id_matriz !== undefined && id_matriz !== "all") {
        where += ` AND f.id_matriz =? `;
        params.push(id_matriz);
      }
      if (id_status && id_status !== "all") {
        where += ` AND t.id_status = ? `;
        params.push(id_status);
      }
      if (ensureArray(filiais_list)) {
        where += ` AND t.id_filial IN ('${ensureArray(filiais_list).join("','")}') `;
      }

      if (ensureArray(status_vencimento_list)) {
        where += ` AND tv.status IN ('${ensureArray(status_vencimento_list).join("','")}') `;
      }
      // Filtra o status mínimo do título
      if (minStatusTitulo) {
        where += ` AND t.id_status >= ? `;
        params.push(minStatusTitulo);
      }
      if (id_conta_bancaria) {
        where += ` AND tr.id_conta_bancaria =? `;
        params.push(id_conta_bancaria);
      }
      if (fornecedor) {
        where += ` AND forn.nome LIKE CONCAT('%',?,'%') `;
        params.push(fornecedor);
      }
      if (descricao) {
        where += ` AND t.descricao LIKE CONCAT('%',?,'%') `;
        params.push(descricao);
      }
      if (num_doc) {
        where += ` AND t.num_doc LIKE CONCAT('%',?)`;
        params.push(num_doc);
      }
      if (range_data) {
        const { from: data_de, to: data_ate } = range_data;
        if (data_de && data_ate) {
          where += ` AND tr.data BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND tr.data = '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND tr.data = '${data_ate.split("T")[0]}' `;
          }
        }
      }

      const [rowsVencimentos] = await conn.execute(
        `
        SELECT count(tv.id) as total
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        ${where}
        `,
        params
      );
      const totalVencimentos = (rowsVencimentos && rowsVencimentos[0]["total"]) || 0;

      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const query = `
        SELECT
            tv.*,
            t.id as id_titulo, t.descricao, t.num_doc,
            forn.nome as fornecedor,
            f.nome as filial, f.id_matriz,
            (tv.valor - tv.valor_pago) as valor_em_aberto
        FROM fin_cr_titulos_vencimentos tv
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        ${where}
        ORDER BY tv.data_vencimento DESC
        ${limit}
        `;

      // console.log(query, params);
      const [recebimentos] = await conn.execute(query, params);
      const objResponse = {
        rows: recebimentos,
        pageCount: Math.ceil(totalVencimentos / pageSize),
        rowCount: totalVencimentos,
      };
      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "GET_ALL_VENCIMENTOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
