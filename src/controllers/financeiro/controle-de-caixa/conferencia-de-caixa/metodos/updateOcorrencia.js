const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_user_criador,
      id_user_resolvedor,
      id_filial,
      data_ocorrencia,
      data_caixa,
      descricao,
      resolvida,
    } = req.body;

    const conn = await db.getConnection();
    try {
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (
        !(id_user_criador && id_filial && data_ocorrencia && data_caixa && descricao && resolvida)
      ) {
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

      await conn.execute(
        `UPDATE datasys_caixas_ocorrencias
          SET id_user_criador = ?, id_user_resolvedor = ?,
          id_filial = ?, data_ocorrencia = ?,
          data_caixa = ?, descricao = ?, resolvida = ?
        WHERE id = ?;`,
        [
          id_user_criador,
          id_user_resolvedor || null,
          id_filial,
          startOfDay(data_ocorrencia),
          startOfDay(data_caixa),
          descricao,
          resolvida,
          id,
        ]
      );

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "UPDATE_OCORRÊNCIA",
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
