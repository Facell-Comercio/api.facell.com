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
      grupo_estoque_list,
      subgrupo_list,
      uf_list,
      filiais_list,
      plano_habilitado_list,
      modalidade_venda_list,
      fabricante_list,
      tipo_pedido_list,

      range_data_pedido,
      valor_minimo,
      valor_maximo,
      descricao,
      fidelizacao_aparelho,
      fidelizacao_plano,
    } = filters || {};

    let where = ` 
        WHERE 1=1
        AND tipoPedido = 'Venda'
        AND gsm IS NOT NULL
        AND Date(dataPedido) >= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`;

    const params = [];

    if (grupo_estoque_list && grupo_estoque_list.length > 0) {
      where += ` AND grupoEstoque IN('${ensureArray(grupo_estoque_list).join("','")}') `;
    }
    if (subgrupo_list && subgrupo_list.length > 0) {
      where += ` AND subgrupo IN('${ensureArray(subgrupo_list).join("','")}') `;
    }
    if (uf_list && uf_list.length > 0) {
      where += ` AND area IN('${ensureArray(uf_list).join("','")}') `;
    }
    if (range_data_pedido) {
      const { from: data_de, to: data_ate } = range_data_pedido;
      if (data_de && data_ate) {
        where += ` AND DATE(dataPedido) BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND DATE(dataPedido) >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND DATE(dataPedido) <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (valor_minimo) {
      where += ` AND valorCaixa >=? `;
      params.push(valor_minimo);
    }
    if (valor_maximo) {
      where += ` AND valorCaixa <=? `;
      params.push(valor_maximo);
    }
    if (filiais_list && filiais_list.length > 0) {
      where += ` AND filial IN('${ensureArray(filiais_list).join("','")}') `;
    }
    if (descricao) {
      where += ` AND descricao LIKE CONCAT("%",?,"%") `;
      params.push(descricao);
    }
    if (plano_habilitado_list && plano_habilitado_list.length > 0) {
      where += ` AND planoHabilitacao IN('${ensureArray(plano_habilitado_list).join("','")}') `;
    }
    if (modalidade_venda_list && modalidade_venda_list.length > 0) {
      where += ` AND modalidadeVenda IN('${ensureArray(modalidade_venda_list).join("','")}') `;
    }
    if (fabricante_list && fabricante_list.length > 0) {
      where += ` AND fabricante IN('${ensureArray(fabricante_list).join("','")}') `;
    }
    if (tipo_pedido_list && tipo_pedido_list.length > 0) {
      where += ` AND tipoPedido IN('${ensureArray(tipo_pedido_list).join("','")}') `;
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
        `SELECT COUNT(id) as qtde FROM datasys_vendas ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      //* COLETA DE DADOS PARA FILTRAGEM
      //~ GRUPO ESTOQUE
      const [grupo_estoque_list] = await conn.execute(
        `SELECT DISTINCT grupoEstoque as value FROM datasys_vendas ${where}`,
        params
      );

      //~ SUBGRUPO
      const [subgrupo_list] = await conn.execute(
        `SELECT DISTINCT subgrupo as value FROM datasys_vendas ${where}`,
        params
      );

      //~ UF/AREA
      const [uf_list] = await conn.execute(
        `SELECT DISTINCT area as value FROM datasys_vendas ${where}`,
        params
      );

      //~ FILIAL
      const [filiais_list] = await conn.execute(
        `SELECT DISTINCT filial as value FROM datasys_vendas ${where}`,
        params
      );

      //~ PLANO HABILITADO
      const [plano_habilitado_list] = await conn.execute(
        `SELECT DISTINCT planoHabilitacao as value FROM datasys_vendas ${where}`,
        params
      );

      //~ MODALIDADE VENDA
      const [modalidade_venda_list] = await conn.execute(
        `SELECT DISTINCT modalidadeVenda as value FROM datasys_vendas ${where}`,
        params
      );

      //~ FABRICANTE
      const [fabricante_list] = await conn.execute(
        `SELECT DISTINCT fabricante as value FROM datasys_vendas ${where}`,
        params
      );

      //~ TIPO DE PEDIDO
      const [tipo_pedido_list] = await conn.execute(
        `SELECT DISTINCT tipoPedido as value FROM datasys_vendas ${where}`,
        params
      );

      const filters = {
        grupo_estoque_list,
        subgrupo_list,
        uf_list,
        filiais_list,
        plano_habilitado_list,
        modalidade_venda_list,
        fabricante_list,
        tipo_pedido_list,
      };

      //* FIM COLETA DE DADOS PARA FILTRAGEM

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
        filters,
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
