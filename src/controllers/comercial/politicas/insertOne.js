const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { descricao, month, year } = req.body;
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!descricao) {
        throw new Error(
          "Descrição não informada!"
        );
      }
      if (!month) {
        throw new Error(
          "Mês de referência não informado!"
        );
      }
      if (!year) {
        throw new Error(
          "Ano de referência não informado!"
        );
      }
      const dataAtual = new Date();
      if (
        new Date(year, month - 1, 1) <
        new Date(
          dataAtual.getFullYear(),
          dataAtual.getMonth(),
          1
        )
      ) {
        throw new Error(
          "Período de referência inferior ao atual!"
        );
      }
      conn = await db.getConnection();

      const [result] = await conn.execute(
        `INSERT INTO comissao_politica (ref, descricao) VALUES (?,?)`,
        [new Date(year, month - 1, 1), descricao]
      );
      const newId = result.insertId;
      if (!newId) {
        throw new Error(
          "Houve algum erro na criação de uma nova política"
        );
      }

      resolve({
        message: "Sucesso",
        new_id_politica: newId,
      });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "INSERT_ONE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
