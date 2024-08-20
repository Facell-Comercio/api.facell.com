const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

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
      const [rowsDepositosCaixa] = await conn.execute(
        `
        SELECT 
          dcd.id, dcd.id_conta_bancaria, cc.descricao as conta_bancaria, 
          dcd.comprovante, dcd.valor, dcd.data_deposito, dcd.id_caixa
        FROM datasys_caixas_depositos dcd
        LEFT JOIN fin_contas_bancarias cc ON cc.id = dcd.id_conta_bancaria
        WHERE dcd.id = ?
        `,
        [id]
      );
      const depositos_caixa = rowsDepositosCaixa && rowsDepositosCaixa[0];

      resolve(depositos_caixa);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ONE_DEPOSITO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
