const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function updateAbatimento(req) {
  return new Promise(async (resolve, reject) => {
    const { id, id_vale, obs, valor } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowsAbatimentos] = await conn.execute(
        `
        SELECT
          v.saldo as saldo_abatimento, va.valor as valor_inicial
        FROM vales_abatimentos va
        LEFT JOIN vales v ON v.id = va.id_vale
        WHERE va.id = ?`,
        [id]
      );
      const { valor_inicial, saldo_abatimento } =
        rowsAbatimentos && rowsAbatimentos[0];

      const valorAbatido = parseFloat(valor_inicial) - parseFloat(valor);
      if (Math.abs(valorAbatido) > parseFloat(saldo_abatimento)) {
        throw new Error("Valor do abatimento ultrapassa o saldo do vale!");
      }

      await conn.execute(
        `UPDATE vales_abatimentos SET
          valor = ?,
          obs = ?
        WHERE id = ?`,
        [valor, obs, id]
      );

      await conn.execute(
        `UPDATE vales SET
          saldo = saldo ${valorAbatido > 0 ? "+ ?" : "- ?"}
        WHERE id = ?`,
        [Math.abs(valorAbatido), id_vale]
      );

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "UPDATE_ABATIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
