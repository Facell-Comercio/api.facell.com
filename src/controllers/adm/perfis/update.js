const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros

  let conn;

  try {
    const { id, perfil, updatePermissoes, permissoes, active } = req.body;

    conn = await db.getConnection();
    await conn.beginTransaction();

    if (!id) {
      throw new Error("ID não informado!");
    }
    if (!perfil) {
      throw new Error("É necessário informar o nome!");
    }

    await conn.execute("UPDATE perfis SET perfil = ?, active = ? WHERE id = ?", [
      String(perfil).toUpperCase(),
      active,
      id,
    ]);

    if (updatePermissoes) {
      await conn.execute(`DELETE FROM perfis_permissoes WHERE id_perfil = ?`, [id]);
      for (const permissao of permissoes) {
        await conn.execute("INSERT INTO perfis_permissoes (id_perfil, id_permissao) VALUES (?,?)", [
          id,
          permissao.id_permissao,
        ]);
      }
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "ADM",
      origin: "PERMISSOES",
      method: "UPDATE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (conn) await conn.rollback();
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
