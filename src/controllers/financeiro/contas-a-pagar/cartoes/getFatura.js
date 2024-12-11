const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function getFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const conn = await db.getConnection();
    try {
      const [rowFaturas] = await conn.execute(
        `
              SELECT 
                  ccf.*, ccf.valor + ccf.estorno as valor_inicial, fcc.dia_vencimento
              FROM fin_cartoes_corporativos_faturas ccf
              LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = ccf.id_cartao
              WHERE ccf.id = ?
              `,
        [id]
      );
      const fatura = rowFaturas && rowFaturas[0];
      
      //* Compras aprovadas
      const [rowComprasAprovadas] = await conn.execute(
        `
              SELECT 
                  tv.*,
                  t.id_status, t.created_at, t.num_doc, t.descricao,
                  forn.nome as fornecedor,
                  f.nome as filial,
                  u.nome as solicitante
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
              LEFT JOIN filiais f ON f.id = t.id_filial
              LEFT JOIN users u ON u.id = t.id_solicitante
              WHERE tv.id_fatura = ? AND t.id_status >= 3
              `,
        [id]
      );
      const [rowComprasAprovadasSoma] = await conn.execute(
        `
              SELECT 
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
      const totalAprovadas =
        rowComprasAprovadasSoma &&
        rowComprasAprovadasSoma[0] &&
        rowComprasAprovadasSoma[0].total;

      //* Compras pendentes
      const [rowComprasPendentes] = await conn.execute(
        `
              SELECT 
                  tv.*,
                  t.id_status, t.created_at, t.num_doc, t.descricao,
                  forn.nome as fornecedor,
                  f.nome as filial,
                  u.nome as solicitante
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
              LEFT JOIN filiais f ON f.id = t.id_filial
              LEFT JOIN users u ON u.id = t.id_solicitante
              WHERE tv.id_fatura = ? 
              AND (t.id_status = 1   OR t.id_status = 2)
              `,
        [id]
      );
      const [rowComprasPendentesSoma] = await conn.execute(
        `
              SELECT 
                  SUM(tv.valor) as total
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo
              LEFT JOIN fin_fornecedores forn ON forn.id = t.id_fornecedor
              LEFT JOIN filiais f ON f.id = t.id_filial
              LEFT JOIN users u ON u.id = t.id_solicitante
              WHERE tv.id_fatura = ? 
              AND (t.id_status = 1   OR t.id_status = 2)
              `,
        [id]
      );
      const totalPendentes =
        rowComprasPendentesSoma &&
        rowComprasPendentesSoma[0] &&
        rowComprasPendentesSoma[0].total;

      resolve({
        dados: fatura,

        comprasAprovadas: rowComprasAprovadas,
        totalAprovadas,

        comprasPendentes: rowComprasPendentes,
        totalPendentes,
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "GET_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
};
