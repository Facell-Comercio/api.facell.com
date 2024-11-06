const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const getOneCampanhaGSMS = require("./getOneCampanhaGSMS");

module.exports = async (req, res) => {
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
    const campanha = await getOneCampanhaGSMS({
      params: { id: id_campanha },
      body: {
        filters,
        conn_externa: conn,
      },
    });
    const { qtde_clientes, clientes } = campanha;

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

    const vendedoresWithIndex = vendedores
      .map((vendedor) => ({ ...vendedor, index: 0 }))
      .sort((a, b) => {
        if (a.nome < b.nome) return -1;
        if (a.nome > b.nome) return 1;
        return 0;
      });
    const vendedoresMap = new Map();
    //* ATRIBUINDO VENDEDORES
    let index = 0;
    for (const vendedor of vendedoresWithIndex) {
      for (let i = 0; i < parseInt(vendedor.qtde_clientes); i += 0) {
        // Adicionar cliente ao Map correspondente ao vendedor
        if (!vendedoresMap.has(vendedor.nome)) {
          vendedoresMap.set(vendedor.nome, []);
        }

        vendedoresMap.get(vendedor.nome).push(clientes[index].id);

        vendedor.index = vendedor.index + 1;
        i++;
        index++;
      }
    }

    // Executar uma query de update por vendedor
    for (const [nome, ids] of vendedoresMap.entries()) {
      await conn.execute(
        `UPDATE marketing_mailing_clientes SET vendedor = ? WHERE id IN ('${ids.join("','")}')`,
        [nome]
      );
    }

    await conn.commit();
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "MARKETING",
      origin: "MAILING",
      method: "DEFINIR_VENDEDORES_LOTE",
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
