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
      body: {
        filters,
        conn_externa: conn,
      },
    });

    //* INSERINDO A CAMPANHA
    const rowsClientes = clientes.rows;
    const [resultCampanha] = await conn.execute(
      "INSERT INTO marketing_mailing_campanhas (nome, data_inicio, id_user) VALUES (?, ?, ?)",
      [String(nome).trim().toUpperCase(), startOfDay(data_inicio), user.id]
    );
    const campanha_id = resultCampanha.insertId;

    const arrayClientes = [];
    const maxLength = 10000;
    let totalClientes = clientes.rowCount;

    //* INSERINDO OS CLIENTES
    for (const cliente of rowsClientes) {
      cliente.id_campanha = campanha_id;
      arrayClientes.push(
        `(
          ${db.escape(cliente.gsm)},
          ${db.escape(cliente.gsm_portado)},
          ${db.escape(cliente.cpf_cliente)},
          ${db.escape(cliente.data_compra)},
          ${db.escape(cliente.plano_habilitado)},
          ${db.escape(cliente.uf)},
          ${db.escape(cliente.produto_compra)},
          ${db.escape(cliente.desconto_plano)},
          ${db.escape(cliente.valor_caixa)},
          ${db.escape(cliente.filial)},
          ${db.escape(cliente.id_campanha)},
          ${db.escape(cliente.cliente)}
        )`
      );

      if (arrayClientes.length === maxLength || totalClientes === 1) {
        const query = `INSERT INTO marketing_mailing_clientes
        (
          gsm, gsm_portado, cpf, data_ultima_compra, plano_habilitado, uf,
          produto_ultima_compra, desconto_plano, valor_caixa, filial, id_campanha, cliente
          )
          VALUES
          ${arrayClientes.join(",")}
          `;
        await conn.execute(query);
        arrayClientes.length = 0;
      }
      totalClientes--;
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
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
