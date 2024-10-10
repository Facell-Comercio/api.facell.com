const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async = (req) => {
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

      const queryConsulta = `
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
            dataPedido as data_compra
          FROM datasys_vendas
            ${where}
          LIMIT 50
        `;
      const [compras] = await conn.execute(queryConsulta);

      conn.config.namedPlaceholders = true;

      for (const compra of compras) {
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
            data_compra
            )
            VAlUES 
            (
            :grupo_estoque,
            :subgrupo,
            :gsm,
            :gsm_portado,
            :cpf_cliente,
            :cliente,
            :cpf_vendedor,
            :vendedor,
            :plano_habilitado,
            :produto_compra,
            :modalidade,
            :codigo_produto,
            :desconto_plano,
            :valor_caixa,
            :filial,
            :uf,
            :tipo_pedido,
            :fornecedor,
            :fabricante,
            :data_compra)
          `;
        await conn.execute(queryInsert, compra);
      }

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
