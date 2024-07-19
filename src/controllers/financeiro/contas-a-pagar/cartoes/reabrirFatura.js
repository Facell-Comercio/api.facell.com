const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function reabrirFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.body;

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      if (!id) {
        throw new Error("ID da fatura não informado!");
      }

      const [rowFatura] = await conn.execute(
        `SELECT cf.* FROM fin_cartoes_corporativos_faturas cf WHERE cf.id = ?`,
        [id]
      );
      const fatura = rowFatura && rowFatura[0];
      if (!fatura) {
        throw new Error(`Fatura de ID ${id} não localizada no sistema!`);
      }
      if (fatura.status == "pago" || fatura.status == "programado") {
        throw new Error(`Fatura já foi paga ou programada para pagamento!`);
      }

      // ! Removemos de um possível bordero:
      await conn.execute(
        `DELETE FROM fin_cp_bordero_itens WHERE id_fatura = ?`,
        [id]
      );

      //* Abrimos de fato a fatura:
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET closed = 0 WHERE id = ?`,
        [id]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "REABRIR_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
