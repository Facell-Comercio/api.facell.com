const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      const [caixas] = await conn.execute(
        `
        SELECT 
          dc.*,
          COALESCE(SUM(dco.resolvida = 0),0) as ocorrencias,
          (dc.valor_dinheiro - dc.valor_retiradas) as total_dinheiro,
          (dc.valor_cartao_real - dc.valor_cartao) as divergencia_cartao,
          (dc.valor_recarga_real - dc.valor_recarga) as divergencia_recarga,
          (dc.valor_pitzi_real - dc.valor_pitzi) as divergencia_pitzi,
          (dc.valor_pix_banco - dc.valor_pix) as divergencia_pix,
          (dc.valor_tradein_utilizado - dc.valor_tradein) as divergencia_tradein,
          f.nome as filial
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        LEFT JOIN datasys_caixas_ocorrencias dco ON dco.id_filial = dc.id_filial AND dco.data = dc.data
        WHERE dc.id = ?
        `,
        [id]
      );

      const caixa = caixas && caixas[0];
      resolve(caixa);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA DE CAIXA",
        method: "GET_ALL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
