const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros

  let conn;

  try {
    const { id, perfil, permissoes } = req.body;

    conn = await db.getConnection();
    await conn.beginTransaction();

    if (id) {
      throw new Error(
        "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
      );
    }
    if (!perfil) {
      throw new Error("É necessário informar o nome!");
    }

    const [result] = await conn.execute("INSERT INTO perfis (perfil) VALUES (?)", [
      String(perfil).toUpperCase(),
    ]);

    for (const permissao of permissoes) {
      await conn.execute("INSERT INTO perfis_permissoes (id_perfil, id_permissao) VALUES (?,?)", [
        result.insertId,
        permissao.id_permissao,
      ]);
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "ADM",
      origin: "PERMISSOES",
      method: "INSERT_ONE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
