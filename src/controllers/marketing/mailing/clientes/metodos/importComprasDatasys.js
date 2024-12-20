const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { range_datas } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      let where = " WHERE 1 = 1 ";
      if (range_datas) {
        const { from: data_de, to: data_ate } = range_datas;
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

      // console.log("INICIOU");
      // console.time("Tempo total da importação");
      // console.time("Tempo da consulta");
      const queryConsultaFacell = `
          SELECT
            grupoEstoque AS grupo_estoque,
            subgrupo,
            gsm,
            gsmPortado AS gsm_portado,
            cpfCliente AS cpf_cliente,
            nomeCliente AS cliente,
            cpfVendedor AS cpf_vendedor,
            nomeVendedor AS vendedor,
            planoHabilitacao AS plano_habilitado,
            descricao AS produto_compra,
            modalidadeVenda AS modalidade,
            codProduto AS codigo_produto,
            descontoPlano AS desconto_plano,
            valorCaixa AS valor_caixa,
            filial,
            area AS uf,
            tipoPedido AS tipo_pedido,
            fornecedor,
            fabricante,
            fidAparelho AS fid_aparelho,
            fidPlano AS fid_plano,
            dataPedido as data_compra,
            numeroPedido as numero_pedido,
            item
          FROM datasys_vendas
            ${where}
        `;
      const [comprasFacell] = await conn.execute(queryConsultaFacell);
      const queryConsultaFort = `
          SELECT
            grupoEstoque AS grupo_estoque,
            subgrupo,
            gsm,
            gsmPortado AS gsm_portado,
            cpfCliente AS cpf_cliente,
            nomeCliente AS cliente,
            cpfVendedor AS cpf_vendedor,
            nomeVendedor AS vendedor,
            planoHabilitacao AS plano_habilitado,
            descricao AS produto_compra,
            modalidadeVenda AS modalidade,
            codProduto AS codigo_produto,
            descontoPlano AS desconto_plano,
            valorCaixa AS valor_caixa,
            filial,
            area AS uf,
            tipoPedido AS tipo_pedido,
            fornecedor,
            fabricante,
            fidAparelho AS fid_aparelho,
            fidPlano AS fid_plano,
            dataPedido as data_compra,
            numeroPedido as numero_pedido,
            item
          FROM datasys_vendas_fort
            ${where}
        `;
      const [comprasFort] = await conn.execute(queryConsultaFort);

      const compras = [...comprasFacell, ...comprasFort];
      let totalCompras = compras.length;

      // console.log("CONSULTOU");
      // console.timeEnd("Tempo da consulta");
      const arrayCompras = [];
      const maxLength = 5000;

      let totalInseridos = 1;

      for (const compra of compras) {
        //*
        arrayCompras.push(`
        (${db.escape(compra.grupo_estoque)},
        ${db.escape(compra.subgrupo)},
        ${db.escape(compra.gsm)},
        ${db.escape(compra.gsm_portado)},
        ${db.escape(compra.cpf_cliente)},
        ${db.escape(compra.cliente)},
        ${db.escape(compra.cpf_vendedor)},
        ${db.escape(compra.vendedor)},
        ${db.escape(compra.plano_habilitado)},
        ${db.escape(compra.produto_compra)},
        ${db.escape(compra.modalidade)},
        ${db.escape(compra.codigo_produto)},
        ${db.escape(compra.desconto_plano)},
        ${db.escape(compra.valor_caixa)},
        ${db.escape(compra.filial)},
        ${db.escape(compra.uf)},
        ${db.escape(compra.tipo_pedido)},
        ${db.escape(compra.fornecedor)},
        ${db.escape(compra.fabricante)},
        ${db.escape(compra.fid_aparelho)},
        ${db.escape(compra.fid_plano)},
        ${db.escape(compra.data_compra)},
        ${db.escape(compra.num_pedido)},
        ${db.escape(compra.item)})
      `);

        if (arrayCompras.length === maxLength || totalCompras === 1) {
          const queryInsert = `
            INSERT IGNORE INTO marketing_mailing_compras
            (
              grupo_estoque,
              subgrupo,
              gsm,
              gsm_portado,
              cpf_cliente,
              cliente,
              cpf_vendedor,
              vendedor,
              plano_habilitado,
              produto_compra,
              modalidade,
              codigo_produto,
              desconto_plano,
              valor_caixa,
              filial,
              uf,
              tipo_pedido,
              fornecedor,
              fabricante,
              fid_aparelho,
              fid_plano,
              data_compra,
              num_pedido,
              item
              )
              VAlUES
              ${arrayCompras.join(",")}
            `;
          await conn.execute(queryInsert);
          arrayCompras.length = 0;
          // console.log(`${totalInseridos}/${compras.length}`);
          // console.timeEnd("Tempo do lote");
          // console.time("Tempo do lote");
        }

        totalInseridos++;
        totalCompras--;
      }
      // console.timeEnd("Tempo total da importação");

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "INSERT_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
