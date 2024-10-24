const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, id_user_criador, id_filial, data_ocorrencia, data_caixa, descricao } = req.body;

    const conn = await db.getConnection();
    try {
      if (id) {
        throw new Error(
          "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
        );
      }
      if (!(id_user_criador && id_filial && data_ocorrencia && data_caixa && descricao)) {
        throw new Error("Todos os campos são obrigatórios!");
      }
      await conn.beginTransaction();

      const [rowsCaixas] = await conn.execute(
        `
        SELECT id, status FROM datasys_caixas
        WHERE id_filial = ? AND data = ?
        AND (status = 'CONFIRMADO' OR status = 'CONFIRMADO')
      `,
        [id_filial, startOfDay(data_caixa)]
      );

      if (rowsCaixas && rowsCaixas.length > 0) {
        throw new Error("O caixa selecionado já foi baixado");
      }

      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_ocorrencias (id_user_criador, id_filial, data_ocorrencia, data_caixa, descricao) VALUES (?,?,?,?,?);`,
        [id_user_criador, id_filial, startOfDay(data_ocorrencia), startOfDay(data_caixa), descricao]
      );

      const newId = result.insertId;
      if (!newId) {
        throw new Error("Falha ao inserir a ocorrência!");
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "INSERT_OCORRÊNCIA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      conn.release();
    }
  });
};
