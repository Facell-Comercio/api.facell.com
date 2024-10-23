const { db } = require("../../../../mysql");

// DEVOLUÇÕES
async function listarAparelhosPOS(anoMes, filial = null, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject("[LISTAR APARELHOS P.O.S].: Grupo não informado!");
      return false;
    }

    const datasys_vendas =
      grupo_economico === "FACELL" ? "datasys_vendas" : "datasys_vendas_fort";
    const facell_docs =
      grupo_economico === "FACELL" ? "facell_docs" : "facell_docs_fort";

    try {
      var aparelhos = [];

      if (filial) {
        [aparelhos] = await db.execute(
          `SELECT 
          v.filial, v.tipoPedido, v.nomeVendedor, v.gsm, v.numeroPedido, v.cpfCliente, v.serial, v.descrComercial, v.fidAparelho, v.fidPlano, 
          v.formaPgto1, v.formaPgto2, v.formaPgto3, v.formaPgto4,v.formaPgto5,v.formaPgto6,
          t.thales_status, t.thales_operacao 
            FROM ${datasys_vendas} v
            LEFT JOIN ${facell_docs} t ON t.imei = v.serial
            WHERE 
              v.grupoEstoque = 'APARELHO'
              AND v.fidAparelho = 'SIM'
              AND (v.formaPgto1 LIKE '%-POS-%' OR v.formaPgto2 LIKE '%-POS-%' OR v.formaPgto3 LIKE '%-POS-%' OR v.formaPgto4 LIKE '%-POS-%' OR v.formaPgto5 LIKE '%-POS-%' OR v.formaPgto6 LIKE '%-POS-%')
                AND v.filial = ?
                AND DATE_FORMAT(v.dataPedido, '%Y-%m') = ?
          `,
          [filial, anoMes]
        );
      } else {
        [aparelhos] = await db.execute(
          `SELECT 
          v.filial, v.tipoPedido, v.nomeVendedor, v.gsm, v.numeroPedido,  v.cpfCliente, v.serial, v.descrComercial, v.fidAparelho, v.fidPlano, 
          v.formaPgto1, v.formaPgto2, v.formaPgto3, v.formaPgto4,v.formaPgto5,v.formaPgto6,
          t.thales_status, t.thales_operacao 
            FROM ${datasys_vendas} v
            LEFT JOIN ${facell_docs} t ON t.imei = v.serial
            WHERE 
              v.grupoEstoque = 'APARELHO'
              AND v.fidAparelho = 'SIM'
              AND (v.formaPgto1 LIKE '%-POS-%' OR v.formaPgto2 LIKE '%-POS-%' OR v.formaPgto3 LIKE '%-POS-%' OR v.formaPgto4 LIKE '%-POS-%' OR v.formaPgto5 LIKE '%-POS-%' OR v.formaPgto6 LIKE '%-POS-%')
              AND DATE_FORMAT(v.dataPedido, '%Y-%m') = ?
        `,
          [anoMes]
        );
      }

      resolve(aparelhos);
      return true;
    } catch (error) {
      console.log("[LISTAR_APARELHOS_POS]", error);
      reject(error);
      return false;
    }
  });
}

module.exports = {
  listarAparelhosPOS,
};
