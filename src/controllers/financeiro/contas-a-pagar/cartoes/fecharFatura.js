const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { normalizeCurrency } = require("../../../../helpers/mask");

module.exports = function fecharFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id, data_prevista, cod_barras, valor } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID da fatura não informado!");
      }
      if (!data_prevista) {
        throw new Error("Data prevista não informada!");
      }
      if (!cod_barras) {
        throw new Error("Código de barras não informado!");
      }
      const [rowValorFatura] = await conn.execute(
        `SELECT 
            SUM(tv.valor) as total
          FROM fin_cp_titulos_vencimentos tv
          LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
          LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN users u ON u.id = t.id_solicitante
          WHERE tv.id_fatura = ? AND t.id_status >= 3
          `,
        [id]
      );
      const total = parseFloat(rowValorFatura && rowValorFatura[0].total) || 0;
      const diferenca = Math.abs(parseFloat(valor) - total);
      if (total < valor) {
        throw new Error(
          `Valor da fatura ultrapassa o esperado em ${normalizeCurrency(
            diferenca
          )}`
        );
      }
      if (total > valor) {
        throw new Error(
          `Valor da fatura inferior ao valor total das compras em ${normalizeCurrency(
            diferenca
          )}`
        );
      }

      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET closed = 1 WHERE id = ?`,
        [id]
      );

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "UPDATE_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
