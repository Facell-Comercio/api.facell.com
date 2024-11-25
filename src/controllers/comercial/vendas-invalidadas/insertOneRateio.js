const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");
const { normalizeNumberFixed } = require("../../../helpers/mask");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const {
      id,
      id_venda_invalida,
      cpf_colaborador,
      nome_colaborador,
      cargo_colaborador,
      valor,
      percentual,
    } = req.body;
    const user = req.user;
    conn = conn_externa || (await db.getConnection());
    if (id) {
      throw new Error(
        "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
      );
    }
    if (!cpf_colaborador) {
      throw new Error("CPF do colaborador é obrigatório!");
    }
    if (!nome_colaborador) {
      throw new Error("Nome do colaborador é obrigatório!");
    }
    if (!cargo_colaborador) {
      throw new Error("Cargo do colaborador é obrigatório!");
    }
    if (!valor) {
      throw new Error("É necessário informar o valor do rateio!");
    }
    if (!percentual) {
      throw new Error("É necessário o percentual do rateio!");
    }

    const [rowsVendaInvalida] = await conn.execute(
      `
      SELECT f.id as id_filial, vi.estorno
      FROM comissao_vendas_invalidas vi
      LEFT JOIN filiais f ON f.nome = vi.filial
      WHERE vi.id = ?`,
      [id_venda_invalida]
    );
    const vendaInvalida = rowsVendaInvalida && rowsVendaInvalida[0];

    if (!vendaInvalida) {
      throw new Error("Venda inválida não encontrada!");
    }

    const [rateios] = await conn.execute(
      "SELECT * FROM comissao_vendas_invalidas_rateio WHERE id_venda_invalida = ?",
      [id_venda_invalida]
    );

    const totalPercentual = rateios.reduce(
      (acc, rateio) => acc + normalizeNumberFixed(rateio.percentual, 6),
      normalizeNumberFixed(parseFloat(percentual) / 100, 6)
    );

    const totalRateio = rateios.reduce(
      (acc, rateio) => acc + normalizeNumberFixed(rateio.valor, 6),
      0
    );

    if (normalizeNumberFixed(totalPercentual, 6) > 1) {
      throw new Error(
        `Percentual acima do permitido! Valor máximo permitido para esse rateio é de R$${normalizeNumberFixed(
          vendaInvalida.estorno - totalRateio,
          6
        )}`
      );
    }

    await conn.execute(
      `INSERT INTO comissao_vendas_invalidas_rateio (
        id_venda_invalida,
        id_filial,
        cpf_colaborador,
        nome_colaborador,
        cargo_colaborador,
        valor,
        percentual
      ) VALUES (?,?,?,?,?,?,?)`,
      [
        id_venda_invalida,
        vendaInvalida.id_filial,
        cpf_colaborador,
        nome_colaborador,
        cargo_colaborador,
        valor,
        percentual / 100,
      ]
    );
    res.status(200).json({ message: "Success" });
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "VENDAS_INVALIDAS",
      method: "INSERT_ONE_CONTESTACAO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    let message = String(error.message);
    if (message.toUpperCase().includes("DUPLICATE ENTRY")) {
      message = "Rateio duplicado! Colaborador já usado em outro rateio nesta venda!";
    }
    res.status(500).json({ message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
