const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const getAllCompras = require("./getAllCompras");
const { startOfDay } = require("date-fns");
const getOneCampanha = require("./getOneCampanha");

module.exports = (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    // Filtros
    const { id_campanha, filters, vendedores } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      //* CONSULTANDO A CAMPANHA DE ACORDO COM OS FILTROS
      const campanha = await getOneCampanha({
        params: { id: id_campanha },
        query: { filters },
        body: {
          conn_externa: conn,
        },
      });
      const { clientes, qtde_clientes } = campanha;

      //* VALIDAÇÃO DE QTDE CLIENTES EM VENDEDORES
      const qtde_clientes_vendedores = vendedores.reduce(
        (acc, vendedor) => acc + parseInt(vendedor.qtde_clientes),
        0
      );

      if (qtde_clientes_vendedores !== qtde_clientes) {
        throw new Error(
          "Quantidade de clientes nos vendedores diverge da quantidade de clientes filtrados"
        );
      }

      //* VALIDAÇÃO VENDEDORES COM NOMES INVÁLIDOS
      const vendedoresInvalidos = vendedores.filter((vendedor) => !vendedor.nome);
      if (vendedoresInvalidos.length > 0) {
        throw new Error("Há vendedores sem nome");
      }

      const vendedoresWithIndex = vendedores.map((vendedor) => ({ ...vendedor, index: 0 }));
      //* ATRIBUINDO VENDEDORES
      for (let i = 0; i < qtde_clientes; i += 0) {
        for (const vendedor of vendedoresWithIndex) {
          if (vendedor.index === parseInt(vendedor.qtde_clientes)) {
            continue;
          }

          await conn.execute("UPDATE marketing_mailing_clientes SET vendedor = ? WHERE id = ?", [
            vendedor.nome,
            clientes[i].id,
          ]);
          vendedor.index = vendedor.index + 1;
          i++;
        }
      }

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "DEFINIR_VENDEDORES_LOTE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      if (String(error.message).includes("Duplicate entry")) {
        resolve({ message: "Cliente já cadastrado!" });
      } else {
        reject(error);
      }
    } finally {
      if (conn) conn.release();
    }
  });
};
