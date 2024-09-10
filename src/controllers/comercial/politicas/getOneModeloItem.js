const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;

    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      conn = await db.getConnection();

      const [rowItens] = await conn.execute(
        `
        SELECT
          cpi.*, cs.*, cpi.id, cti.descricao as escalonamento
        FROM comissao_politica_itens cpi 
        LEFT JOIN comissao_segmentos cs ON cs.id = cpi.id_segmento
        LEFT JOIN comissao_politica_cargos cpc ON cpc.id = cpi.id_cargo_politica
        LEFT JOIN comissao_escalonamentos cti ON cti.id = cpc.id_escalonamento
        WHERE cpi.id = ?
        `,
        [id]
      );
      const item = rowItens && rowItens[0];
      const [itensEscalonamento] =
        await conn.execute(
          `SELECT *, ROUND(valor * ${
            item.tipo_premiacao === "percentual"
              ? 100
              : 1
          },2) as valor FROM comissao_politica_itens_escalonamento WHERE id_item_politica = ? ORDER BY percentual ASC`,
          [id]
        );
      const objResponse = {
        ...item,
        itens_escalonamento: itensEscalonamento,
      };

      resolve(objResponse);
    } catch (error) {
      logger.error({
        module: "COMERCIAL",
        origin: "POLÍTICAS",
        method: "GET_ONE_MODELO_ITEM",
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
