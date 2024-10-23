const { db } = require("../../../../mysql");

// DEVOLUÇÕES
async function listarDevolucoes(
  anoMes,
  filial = null,
  grupo_economico
) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject("[LISTAR DEVOLUÇÕES]: Grupo não informado!");
      return false;
    }

    const datasys_vendas = grupo_economico === "FACELL" ? "datasys_vendas" : "datasys_vendas_fort";

    try {
      var devolucoes = [];

      if (filial) {
        [devolucoes] = await db.execute(
          `SELECT 
          v.filial, v.nomeVendedor, v.gsm, v.tipoPedido, v.numeroPedido, v.cpfCliente, v.serial, v.descrComercial, 
              (SELECT COUNT(d.id) 
                  FROM ${datasys_vendas} d 
                  WHERE 
                    d.grupoEstoque = 'APARELHO'
                      AND d.serial = v.serial
                      AND d.dataPedido >= DATE_SUB(v.dataPedido, INTERVAL 30 DAY)
                  GROUP BY d.serial
              ) AS qtde
            FROM ${datasys_vendas} v
            WHERE 
              v.grupoEstoque = 'APARELHO'
                AND v.filial = ?
                AND DATE_FORMAT(v.dataPedido, '%Y-%m') = ?
            GROUP BY v.serial
            HAVING qtde > 1;
          `,
          [filial, anoMes]
        );
      } else {
        [devolucoes] = await db.execute(
          `SELECT 
          v.filial, v.nomeVendedor, v.gsm, v.tipoPedido, v.numeroPedido, v.cpfCliente, v.serial, v.descrComercial, 
              (SELECT COUNT(d.id) 
                  FROM ${datasys_vendas} d 
                  WHERE 
                    d.grupoEstoque = 'APARELHO'
                      AND d.serial = v.serial
                      AND d.dataPedido >= DATE_SUB(v.dataPedido, INTERVAL 30 DAY)
                  GROUP BY d.serial
              ) AS qtde
            FROM ${datasys_vendas} v
            WHERE 
              v.grupoEstoque = 'APARELHO'
                AND DATE_FORMAT(v.dataPedido, '%Y-%m') = ?
            GROUP BY v.serial
            HAVING qtde > 1;
        `,
          [anoMes]
        );
      }

      resolve(devolucoes);
      return true;
    } catch (error) {
      console.log('[LISTAR_DEVOLUÇÕES]', error)
      reject(error);
      return false;
    }
  });
}

module.exports = {
  listarDevolucoes,
};
