const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async (req, res) => {
  let conn;

  try {
    const { id } = req.params;
    conn = await db.getConnection();
    await conn.beginTransaction();

    //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
    const [rowCampanha] = await conn.execute(
      "SELECT id_parent FROM marketing_mailing_campanhas WHERE id = ?",
      [id]
    );

    const campanha = rowCampanha && rowCampanha[0];
    if (!campanha) {
      throw new Error("Campanha não encontrada");
    }

    const { id_parent } = campanha;

    //* SE FOR UMA SUBCAMPANHA
    //* RETORNAR CLIENTES PARA A CAMPANHA PARENT
    await conn.execute(
      "UPDATE marketing_mailing_clientes SET id_campanha = ? WHERE id_campanha = ?",
      [id_parent, id]
    );

    await conn.execute("DELETE FROM marketing_mailing_campanhas WHERE id =?", [id]);

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "DELETE_SUBCAMPANHA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
