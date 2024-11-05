const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      let { id_filial, email } = req.body;

      if (!id_filial) {
        throw new Error("ID Filial não informado!");
      }
      if (!email) {
        throw new Error("Email não informado!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_receptores_boletos (id_filial, email) VALUES(?,?)`,
        [id_filial, email]
      );
      

      await conn.commit();
      resolve({ id: result.insertId });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "INSERT_ONE_RECEPTOR_BOLETO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
