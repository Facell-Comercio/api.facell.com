const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  let conn;

  try {
    const { id } = req.params;

    conn = await db.getConnection();

    const [rowPermissao] = await conn.execute(
      `
        SELECT
          p.*, m.nome as modulo
        FROM permissoes p
        LEFT JOIN modulos m ON m.id = p.id_modulo
        WHERE p.id = ?
        `,
      [id]
    );
    const permissao = rowPermissao && rowPermissao[0];
    if (!permissao) {
      throw new Error("Permissão não encontrada!");
    }

    res.status(200).json(permissao);
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
