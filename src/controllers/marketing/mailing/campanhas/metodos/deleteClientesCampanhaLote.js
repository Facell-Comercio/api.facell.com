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
  const { id_campanha, filters } = req.body;

  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
    const campanha = await getOneCampanha({
      params: { id: id_campanha },
      body: {
        filters,
        conn_externa: conn,
      },
    });

    const { id_parent } = campanha;

    //* SE FOR UMA SUBCAMPANHA
    //* RETORNAR CLIENTES PARA A CAMPANHA PARENT
    if (id_parent) {
      for (const cliente of campanha.clientes) {
        await conn.execute("UPDATE marketing_mailing_clientes SET id_campanha = ? WHERE id = ?", [
          id_parent,
          cliente.id,
        ]);
      }
    }

    //* SE FOR UMA CAMPANHA
    //* DELETA OS CLIENTES DA CAMPANHA
    if (!id_parent) {
      for (const cliente of campanha.clientes) {
        await conn.execute("DELETE FROM marketing_mailing_clientes WHERE id = ?", [cliente.id]);
      }
    }

    const campanhaFinal = await getOneCampanha({
      params: { id: id_campanha },
      body: {
        conn_externa: conn,
      },
    });

    if (campanhaFinal.qtde_all_clientes === 0) {
      await conn.execute("DELETE FROM marketing_mailing_campanhas WHERE id =?", [id_campanha]);
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "DELETE_CLIENTES_CAMPANHA_LOTE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
