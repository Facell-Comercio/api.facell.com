const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");

module.exports = function insertOne(req) {
  return new Promise(async (resolve, reject) => {
    let conn;
    try {
      conn = await db.getConnection();

      const {
        id,
        id_matriz,
        nome_portador,
        dia_vencimento,
        dia_corte,
        descricao,
        active,
        id_fornecedor,
      } = req.body;

      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
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
        throw new Error("É necessário informar o dia do vencimento!");
      }
      if (active === undefined || active === null) {
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
          INSERT INTO fin_cartoes_corporativos 
          (id_matriz, descricao, nome_portador, dia_vencimento, active, dia_corte, id_fornecedor) VALUES (?,?,?,?,?,?,?);`,
        [
          id_matriz,
          String(descricao).toUpperCase(),
          String(nome_portador).toUpperCase(),
          dia_vencimento,
          active,
          dia_corte,
          id_fornecedor,
        ]
      );
      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CARTÕES",
        method: "INSERT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
