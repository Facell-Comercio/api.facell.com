const { parse, startOfDay } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      data_inicio_cobranca,
      id_colaborador,
      nome_colaborador,
      cpf_colaborador,
      id_filial,
      origem,
      obs,
    } = req.body;
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
      if (!checkCPF(cpf_colaborador)) {
        throw new Error("CPF inválido!");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE vales SET
          data_inicio_cobranca = ?,
          nome_colaborador = ?,
          cpf_colaborador = ?,
          id_filial = ?,
          origem = ?,
          obs = ?,
          updated_at = ?
        WHERE id = ?`,
        [
          startOfDay(data_inicio_cobranca),
          nome_colaborador,
          cpf_colaborador,
          id_filial,
          origem,
          obs,
          new Date(),
          id,
        ]
      );

      // await conn.rollback();
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "VALES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
