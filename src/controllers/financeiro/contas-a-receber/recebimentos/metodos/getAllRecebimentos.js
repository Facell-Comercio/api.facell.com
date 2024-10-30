const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { ensureArray } = require("../../../../../helpers/formaters");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();
      const { filters, pagination, pago, minStatusTitulo, emConciliacao, id_conciliacao } =
        req.query;
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
        range_data,
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
      if (ensureArray(filiais_list)) {
        where += ` AND t.id_filial IN (${ensureArray(filiais_list).join(",")}) `;
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
      if (pago !== undefined) {
        if (Number(pago)) {
          where += ` AND tv.status = "pago" `;
        } else {
          where += ` AND tv.status <> "pago" `;
        }
      }
      if (minStatusTitulo && minStatusTitulo !== undefined) {
        where += ` AND t.id <= ? `;
        params.push(minStatusTitulo);
      }
      if (emConciliacao !== undefined) {
        if (Number(emConciliacao)) {
          where += ` AND cbi.id IS NOT NULL `;
        } else {
          where += ` AND cbi.id IS NULL `;
        }
      }
      if (id_conciliacao) {
        where += ` AND cbi.id_conciliacao = ? `;
        params.push(id_conciliacao);
      }

      const [rowsRecebimentos] = await conn.execute(
        `
        SELECT count(tr.id) as total
        FROM fin_cr_titulos_recebimentos tr
        LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id = tr.id_vencimento
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_contas_bancarias cb ON cb.id = tr.id_conta_bancaria
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN users u ON u.id = tr.id_user
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_item = tr.id AND cbi.tipo = "recebimento"
        ${where}
        `,
        params
      );

      const totalRecebimentos = (rowsRecebimentos && rowsRecebimentos[0]["total"]) || 0;

      const limit = pagination ? "LIMIT ? OFFSET ?" : "";
      if (limit) {
        params.push(pageSize);
        params.push(offset);
      }
      const query = `
        SELECT
            tr.id, tr.id as id_recebimento, tr.data, tr.data as data_recebimento, tr.valor,
            t.id as id_titulo, t.descricao, t.num_doc,
            cb.descricao as conta_bancaria,
            forn.nome as fornecedor,
            f.nome as filial,
            u.nome as criador,
            cbi.id_conciliacao
        FROM fin_cr_titulos_recebimentos tr
        LEFT JOIN fin_cr_titulos_vencimentos tv ON tv.id = tr.id_vencimento
        LEFT JOIN fin_cr_titulos t ON t.id = tv.id_titulo
        LEFT JOIN fin_contas_bancarias cb ON cb.id = tr.id_conta_bancaria
        LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
        LEFT JOIN filiais f ON f.id = t.id_filial
        LEFT JOIN users u ON u.id = tr.id_user
        LEFT JOIN fin_conciliacao_bancaria_itens cbi ON cbi.id_item = tr.id AND cbi.tipo = "recebimento"
        ${where}
        ORDER BY tr.data DESC
        ${limit}
        `;

      const [recebimentos] = await conn.execute(query, params);
      // console.log(query, params);

      const objResponse = {
        rows: recebimentos,
        pageCount: Math.ceil(totalRecebimentos / pageSize),
        rowCount: totalRecebimentos,
      };

      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "RECEBIMENTOS",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
