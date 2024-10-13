const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // console.log(req.params)
    let conn;
    try {
      conn = await db.getConnection();
      const { id_vencimento } = req.query;

      const [recebimentos] = await conn.execute(
        `
        SELECT tr.*, cb.descricao as conta_bancaria, u.nome as usuario
        FROM fin_cr_titulos_recebimentos tr
        LEFT JOIN fin_contas_bancarias cb ON cb.id = tr.id_conta_bancaria
        LEFT JOIN users u ON u.id = tr.id_user
        WHERE tr.id_vencimento = ?
          `,
        [id_vencimento]
      );

      resolve(recebimentos);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "GET_RECEBIMENTOS_VENCIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
