const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function update(req) {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_matriz,
      descricao,
      nome_portador,
      dia_vencimento,
      active,
      dia_corte,
      id_fornecedor,
    } = req.body;
    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!id_matriz) {
        throw new Error("É necessário informar a matriz!");
      }
      if (!descricao) {
        throw new Error("É necessário informar a descrição!");
      }
      if (!nome_portador) {
        throw new Error("É necessário informar o nome do portador!");
      }
      if (!dia_vencimento) {
        throw new Error("É necessário informar a data de vencimento!");
      }
      if (active === undefined) {
        throw new Error("É necessário informar o status!");
      }
      if (!dia_corte) {
        throw new Error("É necessário informar o dia de corte!");
      }
      if (!id_fornecedor) {
        throw new Error("É necessário informar o fornecedor!");
      }
      await conn.beginTransaction();

      await conn.execute(
        `
            UPDATE fin_cartoes_corporativos SET
            id_matriz = ?,
            descricao = ?,
            nome_portador = ?,
            dia_vencimento = ?,
            active = ?,
            dia_corte = ?,
            id_fornecedor = ?
            WHERE id = ?
              `,
        [
          id_matriz,
          String(descricao).toUpperCase(),
          String(nome_portador).toUpperCase(),
          dia_vencimento,
          active,
          dia_corte,
          id_fornecedor,
          id,
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso!" });
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "UPDATE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
};
