const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { mes, ano } = req.query;

    conn = conn_externa || (await db.getConnection());
    let where = `
        WHERE 1=1
        vi.id NOT IN (
            SELECT vir.id_venda_invalida
            FROM comissao_vendas_invalidas_rateio vir
            WHERE vir.id_vale IS NOT NULL
        )
        AND NOT EXISTS (
            SELECT 1
            FROM comissao_vendas_invalidas_contestacoes vic
            WHERE vic.id_venda_invalida = vi.id
        ) `;
    const params = [];
    if (mes) {
      where += ` AND MONTH(vi.ref) = ? `;
      params.push(mes);
    }
    if (ano) {
      where += ` AND YEAR(vi.ref) = ? `;
      params.push(ano);
    }

    await conn.execute(
      `
      DELETE vi FROM comissao_vendas_invalidas vi
      LEFT JOIN comissao_vendas_invalidas_contestacoes vic ON vic.id_venda_invalida = vi.id
      LEFT JOIN comissao_vendas_invalidas_rateio vir ON vir.id_venda_invalida = vi.id
      ${where}`,
      params
    );

    console.log(
      `
      DELETE vi FROM comissao_vendas_invalidas vi
      LEFT JOIN comissao_vendas_invalidas_contestacoes vic ON vic.id_venda_invalida = vi.id
      LEFT JOIN comissao_vendas_invalidas_rateio vir ON vir.id_venda_invalida = vi.id
      ${where}`,
      params
    );

    // await conn.commit();
    await conn.rollback();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "EXCLUIR_VENDAS_INVALIDAS",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
