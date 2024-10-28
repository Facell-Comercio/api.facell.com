const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { startOfDay } = require("date-fns");
const getAllCompras = require("./getAllCompras");

module.exports = async (req, res) => {
  const { user } = req;
  if (!user) {
    reject("Usuário não autenticado!");
    return false;
  }
  // Filtros
  const { nome, data_inicio, filters } = req.body;

  let conn;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    //* CONSULTANDO OS CLIENTES DE ACORDO COM OS FILTROS
    const clientes = await getAllCompras({
      query: { filters },
      body: {
        conn_externa: conn,
      },
    });

    //* INSERINDO A CAMPANHA
    const rowsClientes = clientes.rows;
    const [resultCampanha] = await conn.execute(
      "INSERT INTO marketing_mailing_campanhas (nome, data_inicio, id_user) VALUES (?, ?, ?)",
      [nome, startOfDay(data_inicio), user.id]
    );
    const campanha_id = resultCampanha.insertId;

    conn.config.namedPlaceholders = true;

    //* INSERINDO OS CLIENTES
    for (const cliente of rowsClientes) {
      cliente.id_campanha = campanha_id;

      await conn.execute(
        `INSERT INTO marketing_mailing_clientes
          (
            gsm, gsm_portado, cpf, data_ultima_compra, plano_habilitado, uf,
            produto_ultima_compra, desconto_plano, valor_caixa, filial, id_campanha, cliente
          )
          VALUES (
            :gsm, :gsm_portado, :cpf_cliente, :data_compra, :plano_habilitado, :uf,
            :produto_compra, :desconto_plano, :valor_caixa, :filial, :id_campanha, :cliente
          )`,
        cliente
      );
    }

    await conn.commit();
    res.status(200).json(objResponse);
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "INSERT_CAMPANHA",
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
