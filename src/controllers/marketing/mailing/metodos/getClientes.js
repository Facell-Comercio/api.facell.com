const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { formatDate } = require("date-fns");
const { ensureArray } = require("../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
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

    const {
      grupo_estoque,
      subgrupo,
      areas,
      data_pedido,
      valor_minimo,
      valor_maximo,
      filial,
      descricao,
      plano_habilitacao,
      modalidade_venda,
      fabricante,
      tipo_pedido,
      fidelizacao_aparelho,
      fidelizacao_plano,
    } = filters || {};

    let where = ` WHERE 1=1 `;
    const params = [];

    if (grupo_estoque) {
      where += ` AND grupoEstoque LIKE CONCAT(?,"%") `;
      params.push(grupo_estoque);
    }
    if (subgrupo) {
      where += ` AND subgrupo LIKE CONCAT(?,"%") `;
      params.push(subgrupo);
    }
    if (areas && areas.length > 0) {
      where += ` AND area IN('${ensureArray(areas).join("','")}') `;
    }
    if (data_pedido) {
      where += ` AND DATE(dataPedido) =? `;
      params.push(formatDate(data_pedido, "yyyy-MM-dd"));
    }
    if (valor_minimo) {
      where += ` AND valorCaixa >=? `;
      params.push(valor_minimo);
    }
    if (valor_maximo) {
      where += ` AND valorCaixa <=? `;
      params.push(valor_maximo);
    }
    if (filial) {
      where += ` AND filial LIKE CONCAT("%",?,"%") `;
      params.push(filial);
    }
    if (descricao) {
      where += ` AND descricao LIKE CONCAT("%",?,"%") `;
      params.push(descricao);
    }
    if (plano_habilitacao) {
      where += ` AND planoHabilitacao LIKE CONCAT("%",?,"%") `;
      params.push(plano_habilitacao);
    }
    if (modalidade_venda) {
      where += ` AND modalidadeVenda LIKE CONCAT(?,"%") `;
      params.push(modalidade_venda);
    }
    if (fabricante) {
      where += ` AND fabricante LIKE CONCAT("%",?,"%") `;
      params.push(fabricante);
    }
    if (tipo_pedido) {
      where += ` AND tipoPedido LIKE CONCAT(?,"%") `;
      params.push(tipo_pedido);
    }
    if (fidelizacao_aparelho && fidelizacao_aparelho !== "all") {
      where += ` AND fidAparelho LIKE CONCAT(?,"%") `;
      params.push(fidelizacao_aparelho);
    }
    if (fidelizacao_plano && fidelizacao_plano !== "all") {
      where += ` AND fidPlano LIKE CONCAT(?,"%") `;
      params.push(fidelizacao_plano);
    }

    const conn = await db.getConnection();

    try {
      const [rowQtdeTotal] = await conn.execute(
        `SELECT 
            COUNT(id) as qtde
            FROM datasys_vendas
            ${where}
            AND tipoPedido = 'Venda'
            AND gsm IS NOT NULL
            AND Date(dataPedido) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const query = `
      SELECT
        id, gsm, gsmPortado as gsm_portado, cpfCliente as cpf, dataPedido as data_ultima_compra,
        planoHabilitacao as plano_habilitado, descricao as produto_ultima_compra,
        descontoPlano as desconto_plano, valorCaixa as valor_caixa, filial, area, fabricante,
        subgrupo, tipoPedido as tipo_pedido, modalidadeVenda as modalidade_venda, grupoEstoque as grupo_estoque
      FROM datasys_vendas
      ${where}
      AND tipoPedido = 'Venda'
      AND gsm IS NOT NULL
      AND dataPedido >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)
      ${limit}
      `;

      // console.log(query, params);
      const [rows] = await conn.execute(query, params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
      };
      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_CLIENTES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
