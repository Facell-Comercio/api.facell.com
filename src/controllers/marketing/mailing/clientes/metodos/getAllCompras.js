const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { formatDate } = require("date-fns");
const { ensureArray } = require("../../../../../helpers/formaters");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    try {
      // Filtros
      const { conn_externa, filters, pagination } = req.body;
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
        produto_compra_list,

        range_data_pedido,
        valor_minimo,
        valor_maximo,
        valor_desconto_minimo,
        valor_desconto_maximo,
        produto_compra,
        fidelizacao_aparelho,
        fidelizacao_plano,

        produtos_cliente,
        status_plano,

        nao_desativado,
      } = filters || {};

      let where = "WHERE 1=1";

      const params = [];

      const temGrupoEstoque = grupo_estoque_list && grupo_estoque_list.length > 0;
      if (temGrupoEstoque) {
        where += ` AND mc.grupo_estoque IN(${ensureArray(grupo_estoque_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (subgrupo_list && subgrupo_list.length > 0) {
        where += ` AND mc.subgrupo IN(${ensureArray(subgrupo_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (uf_list && uf_list.length > 0) {
        where += ` AND mc.uf IN(${ensureArray(uf_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (range_data_pedido) {
        const { from: data_de, to: data_ate } = range_data_pedido;
        if (data_de && data_ate) {
          where += ` AND DATE(mc.data_compra) BETWEEN '${data_de.split("T")[0]}' AND '${
            data_ate.split("T")[0]
          }'  `;
        } else {
          if (data_de) {
            where += ` AND DATE(mc.data_compra) <= '${data_de.split("T")[0]}' `;
          }
          if (data_ate) {
            where += ` AND DATE(mc.data_compra) >= '${data_ate.split("T")[0]}' `;
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
      if (valor_desconto_minimo) {
        where += ` AND mc.desconto_plano >= ? `;
        params.push(valor_minimo);
      }
      if (valor_desconto_maximo) {
        where += ` AND mc.desconto_plano <= ? `;
        params.push(valor_maximo);
      }
      if (filiais_list && filiais_list.length > 0) {
        where += ` AND mc.filial IN(${ensureArray(filiais_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (produto_compra) {
        where += ` AND mc.produto_compra LIKE CONCAT("%",?,"%") `;
        params.push(produto_compra);
      }
      if (plano_habilitado_list && plano_habilitado_list.length > 0) {
        where += ` AND mc.plano_habilitado IN(${ensureArray(plano_habilitado_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (modalidade_list && modalidade_list.length > 0) {
        where += ` AND mc.modalidade IN(${ensureArray(modalidade_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (fabricante_list && fabricante_list.length > 0) {
        where += ` AND mc.fabricante IN(${ensureArray(fabricante_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (tipo_pedido_list && tipo_pedido_list.length > 0) {
        where += ` AND mc.tipo_pedido IN(${ensureArray(tipo_pedido_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (produto_compra_list && produto_compra_list.length > 0) {
        where += ` AND mc.produto_compra IN(${ensureArray(produto_compra_list)
          .map((value) => db.escape(value))
          .join(",")}) `;
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
        where += ` AND mc.status_plano IN(${ensureArray(status_plano)
          .map((value) => db.escape(value))
          .join(",")}) `;
      }
      if (nao_desativado && Number(nao_desativado)) {
        where += ` AND mc.status_plano NOT LIKE 'DESATIVADO' `;
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
        //* COM GSM
        if (ensureArray(produtos_cliente).includes("com_gsm")) {
          where += ` AND (mc.gsm IS NOT NULL AND mc.gsm <> '') `;
        }
        //* SEM GSM
        if (ensureArray(produtos_cliente).includes("sem_gsm")) {
          where += ` AND NOT (mc.gsm IS NOT NULL AND mc.gsm <> '') `;
        }
      }
      conn = conn_externa || (await db.getConnection());

      const [rowQtdeTotal] = await conn.execute(
        `
        SELECT COUNT(*) AS qtde
          FROM (
            SELECT DISTINCT mc.id
            FROM marketing_mailing_compras mc
            ${where}
            ${temGrupoEstoque ? "GROUP BY mc.cpf_cliente" : ""}
        ) AS subconsulta
        `,
        params
      );
      const qtdeTotal = (rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]["qtde"]) || 0;

      //* COLETA DE DADOS PARA FILTRAGEM
      //~ GRUPO ESTOQUE
      const [grupo_estoque_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.grupo_estoque as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ SUBGRUPO
      const [subgrupo_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.subgrupo as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ FILIAL
      const [filiais_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.filial as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ PLANO HABILITADO
      const [plano_habilitado_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.plano_habilitado as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ MODALIDADE VENDA
      const [modalidade_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.modalidade as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ FABRICANTE
      const [fabricante_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.fabricante as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ TIPO DE PEDIDO
      const [tipo_pedido_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.tipo_pedido as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ STATUS
      const [status_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.status_plano as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      //~ PRODUTOS
      const [produto_compra_list_filters] = await conn.execute(
        `SELECT DISTINCT mc.produto_compra as value FROM marketing_mailing_compras mc ${where}`,
        params
      );

      const defaultFilters = {
        grupo_estoque_list: grupo_estoque_list_filters,
        subgrupo_list: subgrupo_list_filters,
        filiais_list: filiais_list_filters,
        plano_habilitado_list: plano_habilitado_list_filters,
        modalidade_list: modalidade_list_filters,
        fabricante_list: fabricante_list_filters,
        tipo_pedido_list: tipo_pedido_list_filters,
        status_list: status_list_filters,
        produto_compra_list: produto_compra_list_filters,
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
      ORDER BY mc.data_compra DESC
      ${limit}
      `;

      const [rows] = await conn.execute(query, params);
      const objResponse = {
        rows: rows,
        pageCount: Math.ceil(qtdeTotal / pageSize),
        rowCount: qtdeTotal,
        filters: defaultFilters,
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
