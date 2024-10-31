const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req, res) => {
  let conn;
  let conn_externa = req?.body?.conn_externa;
  try {
    // Filtros
    const { id, active, public } = req.body;

    const params = [];
    const sets = [];
    if (active !== undefined) {
      sets.push(`active = ?`);
      params.push(active);
    }
    if (public !== undefined) {
      sets.push(`public = ?`);
      params.push(public);
    }

    if (sets.length === 0) {
      throw new Error("Nenhum campo foi passado para atualização!");
    }
    conn = conn_externa || (await db.getConnection());
    await conn.beginTransaction();

    const [subcampanhas] = await conn.execute(
      "SELECT * FROM marketing_mailing_campanhas WHERE id_parent = ?",
      [id]
    );
    const idsCampanhas = [id, subcampanhas.map((subcampanha) => subcampanha.id)].flat();

    let query = `UPDATE marketing_mailing_campanhas SET ${sets.join(
      ","
    )} WHERE id IN ('${idsCampanhas.join("','")}')`;

    await conn.execute(query, params);

    if (!conn_externa) {
      await conn.commit();
    }
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "UPDATE_CAMPANHA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
