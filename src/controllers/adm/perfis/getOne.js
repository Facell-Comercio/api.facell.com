const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  let conn;

  try {
    const { id } = req.params;

    conn = await db.getConnection();

    const [rowPerfil] = await conn.execute(`SELECT * FROM perfis WHERE id = ?`, [id]);
    const perfil = rowPerfil && rowPerfil[0];
    if (!perfil) {
      throw new Error("Perfil não encontrado!");
    }
    const [permissoes] = await conn.execute(
      `
      SELECT p.*, p.id as id_permissao, m.nome as modulo FROM permissoes p
      LEFT JOIN perfis_permissoes pp ON pp.id_permissao = p.id
      LEFT JOIN modulos m ON m.id = p.id_modulo
      WHERE pp.id_perfil = ?
      `,
      [id]
    );
    perfil.permissoes = permissoes;

    res.status(200).json(perfil);
  } catch (error) {
    logger.error({
      module: "ADM",
      origin: "PERMISSOES",
      method: "GET_ONE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
};
