const {
  containeranalysis,
} = require("googleapis/build/src/apis/containeranalysis");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const {
      id,
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
      if (!id) {
        throw new Error("ID não definido!");
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
      await conn.execute(
        `
        UPDATE comissao_politica_itens SET id_segmento = ?, tipo = ?, tipo_premiacao = ? WHERE id = ?
      `,
        [id_segmento, tipo, tipo_premiacao, id]
      );
      await conn.execute(
        "DELETE FROM comissao_politica_itens_escalonamento WHERE id_item_politica = ?",
        [id]
      );
      for (const item_escalonamento of itens_escalonamento) {
        await conn.execute(
          `
          INSERT INTO comissao_politica_itens_escalonamento (id_item_politica, percentual, valor) VALUES (?,?,?)
        `,
          [
            id,
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
