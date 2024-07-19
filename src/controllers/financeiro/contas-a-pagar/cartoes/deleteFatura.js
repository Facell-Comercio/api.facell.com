const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function deleteFatura(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.query;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID da fatura não informado!");
      }
      // Busca pelos vencimentos associados à fatura:
      const [rowVencimentosFatura] = await conn.execute(
        `SELECT tv.id FROM fin_cp_titulos_vencimentos tv
        WHERE tv.id_fatura = ?  `,
        [id]
      );
      // ^ Se existir 1 ou mais vencimentos associados, então impede exclusão:
      if (rowVencimentosFatura && rowVencimentosFatura.length > 0) {
        throw new Error(
          `Não é possível excluir a fatura pois existem ${rowVencimentosFatura.length} vencimentos associados a ela!`
        );
      }
      // ! Exclusão da fatura:
      await conn.execute(
        `DELETE FROM fin_cartoes_corporativos_faturas WHERE id = ?`,
        [id]
      );

      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "DELETE_FATURA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
