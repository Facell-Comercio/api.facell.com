const { startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function insertAbatimento(req) {
  return new Promise(async (resolve, reject) => {
    const { id_vale, obs, valor } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    const floatValor = parseFloat(valor);
    let conn;
    try {
      if (!id_vale) {
        throw new Error("ID do Vale não informado");
      }
      if (!valor || !obs) {
        throw new Error("Dados insuficientes!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowsVales] = await conn.execute(
        `
          SELECT saldo FROM vales WHERE id = ?
        `,
        [id_vale]
      );
      const saldo = rowsVales && rowsVales[0].saldo;
      if (floatValor > parseFloat(saldo)) {
        throw new Error("Valor do abatimento é maior que o saldo do vale");
      }

      const [result] = await conn.execute(
        `INSERT INTO vales_abatimentos (
          id_vale,
          valor,
          obs,
          id_user
        ) VALUES(?,?,?,?)`,
        [id_vale, valor, obs, user.id]
      );

      const newId = result.insertId;

      if (!newId) {
        throw new Error(`Vale não inserido`);
      }

      // Atualizar saldo do vale
      await conn.execute(`UPDATE vales SET saldo = saldo - ? WHERE id = ?`, [
        floatValor,
        id_vale,
      ]);

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "INSERT_ABATIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
