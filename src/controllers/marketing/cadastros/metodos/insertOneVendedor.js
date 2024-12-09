const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id, nome, id_user } = req.body;
    conn = conn_externa || (await db.getConnection());

    if (id) {
      throw new Error(
        "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
      );
    }
    if (!nome) {
      throw new Error("Nome do vendedor é obrigatório");
    }
    if (!id_user) {
      throw new Error("É necessário informar o ID do usuário!");
    }

    await conn.execute(`INSERT INTO marketing_vendedores (nome, id_user) VALUES (?,?)`, [
      nome,
      id_user,
    ]);
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "CADASTROS",
      method: "INSERT_ONE_VENDEDOR",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    if (String(error.message).includes("Duplicate entry")) {
      res.status(500).json({ message: "Vendedor já cadastrado!" });
    } else {
      res.status(500).json({ message: error.message });
    }
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
