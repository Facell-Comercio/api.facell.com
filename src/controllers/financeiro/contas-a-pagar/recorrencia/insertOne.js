const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const {
    addMonths
  } = require("date-fns");

module.exports = function insertOneRecorrencia(req) {
    return new Promise(async (resolve, reject) => {
      const conn = await db.getConnection();
      try {
        await conn.beginTransaction();
        const { user } = req;
        const data = req.body;
        const { id, data_vencimento, valor } = data || {};
        // console.log(data);
  
        // ~ Criação da data do mês seguinte
        const new_data_vencimento = addMonths(data_vencimento, 1);
        // console.log(new_data_vencimento);
  
        // ^ Validações
        // Titulo
        if (!id) {
          throw new Error("Campo id não informado!");
        }
  
        const [rowsExistentes] = await conn.execute(
          `SELECT id FROM fin_cp_titulos_recorrencias WHERE id_titulo = ? AND data_vencimento = ?`,
          [id, new Date(new_data_vencimento)]
        );
        if (rowsExistentes && rowsExistentes.length > 0) {
          throw new Error("Recorrência já criada com base nesse título!");
        }
        if (!data_vencimento) {
          throw new Error("Campo data_vencimento não informado!");
        }
  
        // * Criação da Recorrência
        await conn.execute(
          `INSERT INTO fin_cp_titulos_recorrencias 
          (
            id_titulo,
            data_vencimento,
            valor,
            id_user
          )
            VALUES (?,?,?,?)
          `,
          [id, new Date(new_data_vencimento), valor, user.id]
        );
  
        await conn.commit();
        resolve({ message: "Sucesso!" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "INSERT_ONE_RECORRENCIA",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }