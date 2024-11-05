const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const getOneCampanha = require("./getOneCampanha");
const { startOfDay } = require("date-fns");

module.exports = async (req, res) => {
  const { user } = req;
  if (!user) {
    reject("Usuário não autenticado!");
    return false;
  }
  // Filtros
  let conn;

  try {
    const { nome, id_campanha, data_inicio, filters } = req.body;
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
    const { clientes, qtde_clientes } = campanha;

    //* INSERINDO A CAMPANHA
    const [resultSubcampanha] = await conn.execute(
      "INSERT INTO marketing_mailing_campanhas (nome, data_inicio, id_user) VALUES (?,?,?)",
      [String(nome).trim().toUpperCase(), startOfDay(data_inicio), user.id]
    );
    const id_nova_campanha = resultSubcampanha.insertId;
    const arrayClientes = [];
    const maxLength = 10000;
    let totalClientes = qtde_clientes;

    //* INSERINDO OS CLIENTES
    for (const cliente of clientes) {
      cliente.id_campanha = id_nova_campanha;
      arrayClientes.push(
        `(
          ${db.escape(cliente.id_campanha)},
          ${db.escape(cliente.gsm)},
          ${db.escape(cliente.gsm_portado)},
          ${db.escape(cliente.cpf)},
          ${db.escape(cliente.data_ultima_compra)},
          ${db.escape(cliente.plano_habilitado)},
          ${db.escape(cliente.produto_ultima_compra)},
          ${db.escape(cliente.desconto_plano)},
          ${db.escape(cliente.valor_caixa)},
          ${db.escape(cliente.filial)},
          ${db.escape(cliente.uf)},
          ${db.escape(cliente.status_plano)},
          ${db.escape(cliente.fidelizacao1)},
          ${db.escape(cliente.data_expiracao_fid1)},
          ${db.escape(cliente.fidelizacao2)},
          ${db.escape(cliente.data_expiracao_fid2)},
          ${db.escape(cliente.fidelizacao3)},
          ${db.escape(cliente.data_expiracao_fid3)},
          ${db.escape(cliente.cliente)},
          ${db.escape(cliente.codigo_cliente)},
          ${db.escape(cliente.plano_atual)},
          ${db.escape(cliente.produto_fidelizado)},
          ${db.escape(cliente.produto_ofertado)},
          ${db.escape(cliente.tim_data_consulta)}
        )`
      );

      if (arrayClientes.length === maxLength || totalClientes === 1) {
        const query = `
          INSERT INTO marketing_mailing_clientes
          (
            id_campanha,
            gsm,
            gsm_portado,
            cpf,
            data_ultima_compra,
            plano_habilitado,
            produto_ultima_compra,
            desconto_plano,
            valor_caixa,
            filial,
            uf,
            status_plano,
            fidelizacao1,
            data_expiracao_fid1,
            fidelizacao2,
            data_expiracao_fid2,
            fidelizacao3,
            data_expiracao_fid3,
            cliente,
            codigo_cliente,
            plano_atual,
            produto_fidelizado,
            produto_ofertado,
            tim_data_consulta
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
      method: "DUPLICAR_CAMPANHA",
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
