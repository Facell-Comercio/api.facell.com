const {
  containeranalysis,
} = require("googleapis/build/src/apis/containeranalysis");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
      id_cargo_politica,
      id_modelo,
      id_segmento,
      tipo,
      tipo_premiacao,
      itens_escalonamento,
    } = req.body;

    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (id) {
        throw new Error(
          "ID não deve ser passado!"
        );
      }
      if (!id_cargo_politica) {
        throw new Error("Cargo não informado!");
      }
      if (!id_segmento) {
        throw new Error(
          "Segmento não informado!"
        );
      }
      if (!tipo) {
        throw new Error("Tipo não informado!");
      }
      if (!tipo_premiacao) {
        throw new Error(
          "Tipo de premiação não informado!"
        );
      }
      if (
        itens_escalonamento &&
        itens_escalonamento.length <= 0
      ) {
        throw new Error(
          "Escalonamento não informado!"
        );
      }
      conn = await db.getConnection();
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO comissao_politica_itens (id_cargo_politica, id_modelo, id_segmento, tipo, tipo_premiacao) VALUES (?,?,?,?,?)`,
        [
          id_cargo_politica,
          id_modelo || null,
          id_segmento,
          tipo,
          tipo_premiacao,
        ]
      );
      const newId = result.insertId;

      for (const item_escalonamento of itens_escalonamento) {
        await conn.execute(
          `
          INSERT INTO comissao_politica_itens_escalonamento (id_item_politica, percentual, valor) VALUES (?,?,?)
        `,
          [
            newId,
            item_escalonamento.percentual,
            item_escalonamento.valor,
          ]
        );
      }

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "UPDATE_MODELO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
