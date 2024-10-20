const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getCaixaAnterior = require("./getCaixaAnterior");
const updateSaldo = require("./updateSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      const { id, campo, valor } = req.body;

      const campos_permitidos = ["manual"];
      if (!campos_permitidos.includes(campo)) {
        throw new Error(`Não é permitido atualizar o campo ${campo}!`);
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowsCaixas] = await conn.execute(
        `
            SELECT 
            dc.id, dc.status
            FROM datasys_caixas dc
            WHERE dc.id = ?
            `,
        [id]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      if (!caixa) {
        throw new Error(`Caixa ID ${id} não existe no sistema!`);
      }
      if (caixa.status === "CONFIRMADO" || caixa.status === "CONFIRMADO") {
        throw new Error(`Nenhuma ação pode ser realizada nesse caixa`);
      }

      await conn.execute(`UPDATE datasys_caixas SET ${campo} = ? WHERE id = ?`, [valor, id]);

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "CHANGE_VALUE_FIELD_CAIXA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      if (conn) await conn.rollback();
    } finally {
      if (conn) conn.release();
    }
  });
};
