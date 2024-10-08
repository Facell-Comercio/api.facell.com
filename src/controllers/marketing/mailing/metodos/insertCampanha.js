const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const getClientes = require("./getClientes");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { nome, quantidade_lotes, quantidade_total_clientes, lotes, filters } = req.body;
    console.log(req.body);

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      //* CONSULTANDO OS CLIENTES DE ACORDO COM OS FILTROS
      const clientes = await getClientes({
        query: { filters },
        body: {
          conn_externa: conn,
        },
      });

      //* INSERINDO A CAMPANHA
      const rowsClientes = clientes.rows;
      const [resultCampanha] = await conn.execute(
        "INSERT INTO marketing_mailing_campanhas (nome) VALUES (?)",
        [nome]
      );
      const campanha_id = resultCampanha.insertId;

      //* INSERINDO OS LOTES
      const lotesIds = new Map();
      for (const lote of lotes) {
        const [result] = await conn.execute(
          "INSERT INTO marketing_mailing_campanhas (nome, id_parent) VALUES (?,?)",
          [lote.nome, campanha_id]
        );
        lotesIds.set(lote.nome, { ...lote, qtde_inseridos: 0, id: result.insertId });
      }

      conn.config.namedPlaceholders = true;

      //* INSERINDO OS CLIENTES E DISTRIBUINDO EM CADA LOTE
      for (let i = 0; i < quantidade_total_clientes; i + 0) {
        for (const [key, lote] of lotesIds) {
          if (lote.qtde_inseridos === parseInt(lote.quantidade_itens)) {
            continue;
          }
          const cliente = { ...rowsClientes[i], id_campanha: lote.id };
          await conn.execute(
            `INSERT INTO marketing_mailing_clientes
            (
              gsm, gsm_portado, cpf, data_ultima_compra, plano_habilitado, area,
              produto_ultima_compra, desconto_plano, valor_caixa, filial, id_campanha
            )
            VALUES (
              :gsm, :gsm_portado, :cpf, :data_ultima_compra, :plano_habilitado, :area,
              :produto_ultima_compra, :desconto_plano, :valor_caixa, :filial, :id_campanha
            )`,
            cliente
          );
          lote.qtde_inseridos++;
          i++;
        }
      }

      // await conn.commit();
      await conn.rollback();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "INSERT_CAMPANHA",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
