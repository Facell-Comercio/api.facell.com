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
      conn = await db.getConnection();
      const [rowUltimaPolitica] =
        await conn.execute(
          "SELECT ref FROM comissao_politica ORDER BY ref DESC LIMIT 1"
        );
      const ultimaPolitica =
        rowUltimaPolitica && rowUltimaPolitica[0];
      if (
        ultimaPolitica.ref >=
        new Date(year, month - 1, 1)
      ) {
        throw new Error(
          "A data da política não pode ser anterior ou igual à data da última política cadastrada!"
        );
      }

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
