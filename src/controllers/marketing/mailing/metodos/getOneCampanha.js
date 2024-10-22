const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    // Filtros
    const { conn_externa } = req.body;

    let conn;

    try {
      const { id } = req.params || {};
      const {
        plano_habilitado,
        produto,
        produto_fidelizado,
        sem_contato,
        status_plano,
        id_campanha,
      } = req.query.filters || {};

      let where = " WHERE 1=1 ";
      const params = [];

      if (plano_habilitado) {
        where += " AND mc.plano_habilitado LIKE ? ";
        params.push(plano_habilitado);
      }
      if (produto) {
        where += " AND mc.produto_ultima_compra LIKE ? ";
        params.push(produto);
      }
      if (produto_fidelizado !== undefined) {
        if (Number(produto_fidelizado)) {
          where += " AND mc.produto_fidelizado = 1 ";
        } else {
          where += " AND (mc.produto_fidelizado = 0 OR mc.produto_fidelizado IS NULL) ";
        }
      }
      if (sem_contato !== undefined) {
        if (Number(sem_contato)) {
          where += " AND mr.id IS NULL";
        } else {
          where += " AND mr.id IS NOT NULL";
        }
      }
      if (status_plano) {
        where += " AND mc.status_plano =? ";
        params.push(status_plano);
      }
      if (id_campanha) {
        where += " AND mc.id_campanha =? ";
        params.push(id_campanha);
      }
      if (id) {
        where += " AND mc.id_campanha =? ";
        params.push(id);
      }

      conn = conn_externa || (await db.getConnection());

      const [rowCampanha] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id = ?`,
        [id]
      );
      const campanha = rowCampanha && rowCampanha[0];

      const [clientes] = await conn.execute(
        `
        SELECT mc.*, mr.id as id_resultado
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        ${where}`,
        params
      );
      const [rowQtdeClientes] = await conn.execute(
        `
        SELECT COUNT(mc.id) as qtde
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        ${where}`,
        params
      );
      campanha.qtde_clientes =
        (rowQtdeClientes && rowQtdeClientes[0] && rowQtdeClientes[0].qtde) || 0;
      campanha.clientes = clientes;

      const [subcampanhas] = await conn.execute(
        `SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?`,
        [id]
      );
      campanha.subcampanhas = subcampanhas;

      const idsCampanhas = [id, subcampanhas.map((subcampanha) => subcampanha.id)].flat();

      const [allClientes] = await conn.execute(
        `
        SELECT mc.*
        FROM marketing_mailing_clientes mc
        LEFT JOIN marketing_mailing_resultados mr ON mr.id_cliente = mc.id
        WHERE mc.id_campanha IN ('${idsCampanhas.join("','")}')`
      );

      campanha.all_clientes = allClientes;

      resolve(campanha);
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "GET_ONE_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
