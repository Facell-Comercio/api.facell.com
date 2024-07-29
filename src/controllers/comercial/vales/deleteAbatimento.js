const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function deleteAbatimento(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      if (!id) {
        throw new Error("ID do abatimento não informado!");
      }
      //! Atualiza o saldo do vale:
      const [rowsVale] = await conn.execute(
        `
        SELECT id_vale, valor
        FROM vales_abatimentos
        WHERE id = ?
        `,
        [id]
      );
      const vale = rowsVale && rowsVale[0];

      if (!vale) {
        throw new Error("Vale não encontrado!");
      }
      await conn.execute(`UPDATE vales SET saldo = saldo + ? WHERE id = ?`, [
        parseFloat(vale.valor),
        vale.id_vale,
      ]);

      // ! Exclusão de abatimento:
      await conn.execute(`DELETE FROM vales_abatimentos WHERE id = ?`, [id]);

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "DELETE_ABATIMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
