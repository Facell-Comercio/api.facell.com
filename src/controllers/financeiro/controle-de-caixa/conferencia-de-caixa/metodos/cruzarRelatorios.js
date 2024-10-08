const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

function isDivergent(valor_datasys, valor_real, divergente) {
  //^ Se já for divergente retorna true, senão realiza a verificação dos valores
  return (
    divergente ||
    parseFloat(valor_datasys || "0").toFixed(2) !== parseFloat(valor_real || "0").toFixed(2)
  );
}

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    
    let conn;
    try {
      const { id_filial, data_caixa } = req.body;
      conn = req.conn || (await db.getConnection());
      let divergente = false;
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.valor_cartao, dc.valor_recarga, dc.valor_pix, 
          dc.valor_pitzi, dc.valor_tradein, dc.valor_crediario
        FROM datasys_caixas dc
        WHERE dc.id_filial = ? AND dc.data = ?
        `,
        [id_filial, data_caixa]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      //* Validação de vendas no cartão
      const [rowsVendasCartoes] = await conn.execute(
        `
        SELECT SUM(valor_venda) as valor_cartao_real FROM fin_vendas_cartao WHERE id_filial = ? AND data_venda = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasCartoes = rowsVendasCartoes && rowsVendasCartoes[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(caixa.valor_cartao, vendasCartoes.valor_cartao_real, divergente);

      //* Validação de vendas recarga
      const [rowsVendasRecarga] = await conn.execute(
        `
        SELECT SUM(valor) as valor_recarga_real FROM fin_vendas_recarga WHERE id_filial = ? AND data = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasRecarga = rowsVendasRecarga && rowsVendasRecarga[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(caixa.valor_recarga, vendasRecarga.valor_recarga_real, divergente);

      //* Validação de vendas no PIX
      const [rowsVendasPix] = await conn.execute(
        `
        SELECT SUM(valor) as valor_pix_banco FROM fin_vendas_pix WHERE id_filial = ? AND data_venda = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasPix = rowsVendasPix && rowsVendasPix[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(caixa.valor_pix, vendasPix.valor_pix_banco, divergente);

      //* Validação de vendas do Pitzi
      const [rowsVendasPitzi] = await conn.execute(
        `
        SELECT SUM(valor) as valor_pitzi_real FROM pitzi_vendas WHERE id_filial = ? AND data = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasPitzi = rowsVendasPitzi && rowsVendasPitzi[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(caixa.valor_pitzi, vendasPitzi.valor_pitzi_real, divergente);

      //* Validação de vendas do Tradein
      const [rowsVendasTradein] = await conn.execute(
        `
        SELECT SUM(valor) as valor_tradein_utilizado FROM renov_tradein WHERE status = 'UTILIZADO' AND id_filial = ? AND data = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasTradein = rowsVendasTradein && rowsVendasTradein[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(
        caixa.valor_tradein,
        vendasTradein.valor_tradein_utilizado,
        divergente
      );

      //* Validação de vendas do Crediario
      const [rowsVendasCrediario] = await conn.execute(
        `
        SELECT SUM(valor_crediario) as valor_crediario_real FROM fin_vendas_crediario WHERE id_filial = ? AND data = ?
      `,
        [id_filial, data_caixa]
      );
      const vendasCrediario = rowsVendasCrediario && rowsVendasCrediario[0];

      //~ Valida se é divergente ou não
      divergente = isDivergent(
        caixa.valor_crediario,
        vendasCrediario.valor_crediario_real,
        divergente
      );

      //* UPDATE do datasys_caixas
      await conn.execute(
        `
        UPDATE datasys_caixas SET
          valor_cartao_real = ?,
          valor_recarga_real = ?,
          valor_pix_banco = ?,
          valor_pitzi_real = ?,
          valor_tradein_utilizado = ?,
          valor_crediario_real = ?,
          divergente = ?
        WHERE id_filial = ? AND data = ?;
      `,
        [
          parseFloat(vendasCartoes.valor_cartao_real || "0").toFixed(2),
          parseFloat(vendasRecarga.valor_recarga_real || "0").toFixed(2),
          parseFloat(vendasPix.valor_pix_banco || "0").toFixed(2),
          parseFloat(vendasPitzi.valor_pitzi_real || "0").toFixed(2),
          parseFloat(vendasTradein.valor_tradein_utilizado || "0").toFixed(2),
          parseFloat(vendasCrediario.valor_crediario_real || "0").toFixed(2),
          divergente,
          id_filial,
          data_caixa,
        ]
      );

      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "CRUZAR_RELATORIOS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
