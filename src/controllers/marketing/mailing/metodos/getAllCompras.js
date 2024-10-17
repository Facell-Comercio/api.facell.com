const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { formatDate } = require("date-fns");
const { ensureArray } = require("../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { filters, pagination } = req.query;
    const { conn_externa } = req.body;
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
      modalidade_list,
      fabricante_list,
      tipo_pedido_list,

      range_data_pedido,
      valor_minimo,
      valor_maximo,
      produto_compra,
      fidelizacao_aparelho,
      fidelizacao_plano,

      produtos_cliente,
      status_plano,
    } = filters || {};

    let where = "WHERE 1=1";

    const params = [];

    const temGrupoEstoque = grupo_estoque_list && grupo_estoque_list.length > 0;
    if (temGrupoEstoque) {
      where += ` AND mc.grupo_estoque IN('${ensureArray(grupo_estoque_list).join("','")}') `;
    }
    if (subgrupo_list && subgrupo_list.length > 0) {
      where += ` AND mc.subgrupo IN('${ensureArray(subgrupo_list).join("','")}') `;
    }
    if (uf_list && uf_list.length > 0) {
      where += ` AND mc.uf IN('${ensureArray(uf_list).join("','")}') `;
    }
    if (range_data_pedido) {
      const { from: data_de, to: data_ate } = range_data_pedido;
      if (data_de && data_ate) {
        where += ` AND DATE(mc.data_compra) BETWEEN '${data_de.split("T")[0]}' AND '${
          data_ate.split("T")[0]
        }'  `;
      } else {
        if (data_de) {
          where += ` AND DATE(mc.data_compra) >= '${data_de.split("T")[0]}' `;
        }
        if (data_ate) {
          where += ` AND DATE(mc.data_compra) <= '${data_ate.split("T")[0]}' `;
        }
      }
    }
    if (valor_minimo) {
      where += ` AND mc.valor_caixa >=? `;
      params.push(valor_minimo);
    }
    if (valor_maximo) {
      where += ` AND mc.valor_caixa <=? `;
      params.push(valor_maximo);
    }
    if (filiais_list && filiais_list.length > 0) {
      where += ` AND mc.filial IN('${ensureArray(filiais_list).join("','")}') `;
    }
    if (produto_compra) {
      where += ` AND mc.produto_compra LIKE CONCAT("%",?,"%") `;
      params.push(produto_compra);
    }
    if (plano_habilitado_list && plano_habilitado_list.length > 0) {
      where += ` AND mc.plano_habilitado IN('${ensureArray(plano_habilitado_list).join("','")}') `;
    }
    if (modalidade_list && modalidade_list.length > 0) {
      where += ` AND mc.modalidade IN('${ensureArray(modalidade_list).join("','")}') `;
    }
    if (fabricante_list && fabricante_list.length > 0) {
      where += ` AND mc.fabricante IN('${ensureArray(fabricante_list).join("','")}') `;
    }
    if (tipo_pedido_list && tipo_pedido_list.length > 0) {
      where += ` AND mc.tipo_pedido IN('${ensureArray(tipo_pedido_list).join("','")}') `;
    }
    if (fidelizacao_aparelho && fidelizacao_aparelho !== "all") {
      where += ` AND mc.fid_aparelho LIKE CONCAT(?,"%") `;
      params.push(fidelizacao_aparelho);
    }
    if (fidelizacao_plano && fidelizacao_plano !== "all") {
      where += ` AND mc.fid_plano LIKE CONCAT(?,"%") `;
      params.push(fidelizacao_plano);
    }
    if (status_plano && status_plano.length > 0) {
      where += ` AND mc.status_plano IN('${ensureArray(status_plano).join("','")}') `;
    }
    if (produtos_cliente && produtos_cliente.length > 0) {
      //* COM APARELHO
      if (ensureArray(produtos_cliente).includes("com_aparelho")) {
        where += ` AND EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND mcs.grupo_estoque LIKE CONCAT("APARELHO","%") )`;
      }
      //* SEM APARELHO
      if (ensureArray(produtos_cliente).includes("sem_aparelho")) {
        where += ` AND NOT EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND mcs.grupo_estoque LIKE CONCAT("APARELHO","%") )`;
      }
      //* COM ACESSÓRIO
      if (ensureArray(produtos_cliente).includes("com_acessorio")) {
        where += ` AND EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND mcs.grupo_estoque LIKE CONCAT("ACESSORIO","%") )`;
      }
      //* SEM ACESSÓRIO
      if (ensureArray(produtos_cliente).includes("sem_acessorio")) {
        where += ` AND NOT EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND mcs.grupo_estoque LIKE CONCAT("ACESSORIO","%") )`;
      }
      //* COM PLANO
      if (ensureArray(produtos_cliente).includes("com_plano")) {
        where += ` AND EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND (
            mcs.modalidade LIKE 'ativa%' OR
            mcs.modalidade LIKE 'migra%' OR
            mcs.modalidade LIKE 'porta%' OR
            mcs.modalidade LIKE 'depen%'
          )
          AND NOT (mcs.plano_habilitado LIKE '%pre %'
          OR mcs.plano_habilitado LIKE '%pre-%')
          )
          `;
      }
      //* SEM PLANO
      if (ensureArray(produtos_cliente).includes("sem_plano")) {
        where += ` AND NOT EXISTS(
          SELECT 1 FROM marketing_mailing_compras mcs
          WHERE mc.cpf_cliente = mcs.cpf_cliente
          AND DATE(mc.data_compra) = DATE(mcs.data_compra)
          AND (
            mcs.modalidade LIKE 'ativa%' OR
            mcs.modalidade LIKE 'migra%' OR
            mcs.modalidade LIKE 'porta%' OR
            mcs.modalidade LIKE 'depen%'
          )
          AND NOT (mcs.plano_habilitado LIKE '%pre %'
          OR mcs.plano_habilitado LIKE '%pre-%')
          )
          `;
      }
    }

    let conn;

    try {
      conn = conn_externa || (await db.getConnection());

      const [rowQtdeTotal] = await conn.execute(
        `SELECT COUNT(mc.id) as qtde FROM marketing_mailing_compras mc ${where}`,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      //* COLETA DE DADOS PARA FILTRAGEM
      //~ GRUPO ESTOQUE
      const [grupo_estoque_list] = await conn.execute(
        `SELECT DISTINCT mc.grupo_estoque as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ SUBGRUPO
      const [subgrupo_list] = await conn.execute(
        `SELECT DISTINCT mc.subgrupo as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ UF/AREA
      const [uf_list] = await conn.execute(
        `SELECT DISTINCT mc.uf as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ FILIAL
      const [filiais_list] = await conn.execute(
        `SELECT DISTINCT mc.filial as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ PLANO HABILITADO
      const [plano_habilitado_list] = await conn.execute(
        `SELECT DISTINCT mc.plano_habilitado as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ MODALIDADE VENDA
      const [modalidade_list] = await conn.execute(
        `SELECT DISTINCT mc.modalidade as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ FABRICANTE
      const [fabricante_list] = await conn.execute(
        `SELECT DISTINCT mc.fabricante as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ TIPO DE PEDIDO
      const [tipo_pedido_list] = await conn.execute(
        `SELECT DISTINCT mc.tipo_pedido as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ STATUS
      const [status_list] = await conn.execute(
        `SELECT DISTINCT mc.status_plano as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      const filters = {
        grupo_estoque_list,
        subgrupo_list,
        uf_list,
        filiais_list,
        plano_habilitado_list,
        modalidade_list,
        fabricante_list,
        tipo_pedido_list,
        status_list,
      };

      //* FIM COLETA DE DADOS PARA FILTRAGEM

      const limit = pagination ? " LIMIT ? OFFSET ? " : "";
      if (limit) {
        const offset = pageIndex * pageSize;
        params.push(pageSize);
        params.push(offset);
      }
      const query = `
      SELECT mc.* FROM marketing_mailing_compras mc
      ${where}
      ${temGrupoEstoque ? "GROUP BY mc.cpf_cliente" : ""}
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
