const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const getOneCampanha = require("./getOneCampanha");

module.exports = async (req, res) => {
  const { user } = req;
  if (!user) {
    reject("Usuário não autenticado!");
    return false;
  }
  // Filtros
  const { nome, id_parent, filters } = req.body;

  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
    const campanha = await getOneCampanha({
      params: { id: id_parent },
      query: { filters },
      body: {
        conn_externa: conn,
      },
    });

    //* INSERINDO A CAMPANHA
    const [resultSubcampanha] = await conn.execute(
      "INSERT INTO marketing_mailing_campanhas (nome, id_user, id_parent) VALUES (?,?,?)",
      [nome, user.id, id_parent]
    );
    const id_subcampanha = resultSubcampanha.insertId;
    for (const cliente of campanha.clientes) {
      await conn.execute("UPDATE marketing_mailing_clientes SET id_campanha = ? WHERE id = ?", [
        id_subcampanha,
        cliente.id,
      ]);
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "INSERT_SUBCAMPANHA",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    if (String(error.message).includes("Duplicate entry")) {
      res.status(500).json({ message: "Cliente já cadastrado!" });
    } else {
      res.status(500).json({ message: error.message });
    }
  } finally {
    if (conn) conn.release();
  }
};