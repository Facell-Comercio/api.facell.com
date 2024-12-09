const { db } = require("../../../../mysql");
const { logger } = require("../../../../logger");

module.exports = async (req, res) => {
  // Filtros
  const { conn_externa } = req.body;

  let conn;

  try {
    const { id } = req.params;
    conn = conn_externa || (await db.getConnection());

    const [rowEspelho] = await conn.execute(
      `
      SELECT
        c.*, c.updated AS att,
        COALESCE(fm.filial, fa.filial) AS filial,
        COALESCE(fm.cargo, fa.cargo) AS cargo,
        COALESCE(fm.nome, fa.nome) AS nome,
        COALESCE(fm.proporcional, fa.proporcional) AS proporcional,
        COALESCE(fm.data_inicial, fa.data_inicial) AS data_inicial,
        COALESCE(fm.data_final, fa.data_final) AS data_final
      FROM comissao c
      LEFT JOIN metas fm ON fm.id = c.id_meta
      LEFT JOIN metas_agregadores fa ON fa.id = c.id_agregador
      WHERE c.id =?
      `,
      [id]
    );
    const espelho = rowEspelho && rowEspelho[0];
    if (!espelho) {
      throw new Error("Espelho não encontrado!");
    }
    const [parametros] = await conn.execute(
      "SELECT * FROM comissao_parametros WHERE id_comissao = ?",
      [id]
    );
    espelho.parametros = parametros;
    const [comissoes] = await conn.execute(
      "SELECT * FROM comissao_itens WHERE id_comissao = ? AND tipo LIKE 'comissao'",
      [id]
    );
    espelho.comissoes_list = comissoes;
    const [bonus] = await conn.execute(
      "SELECT * FROM comissao_itens WHERE id_comissao = ? AND tipo LIKE 'bonus'",
      [id]
    );
    espelho.bonus_list = bonus;

    const [rowTotalContestacoes] = await conn.execute(
      "SELECT COUNT(id) AS qtde FROM comissao_contestacoes WHERE id_comissao = ?",
      [id]
    );
    const qtdeTotalContestacoes =
      (rowTotalContestacoes && rowTotalContestacoes[0] && rowTotalContestacoes[0]["qtde"]) || 0;
    espelho.qtdeTotalContestacoes = qtdeTotalContestacoes;

    res.status(200).json(espelho);
  } catch (error) {
    logger.error({
      module: "COMERCIAL",
      origin: "ESPELHOS",
      method: "GET_ONE_ESPELHO",
      data: { message: error.message, stack: error.stack, name: error.name },
    });

    res.status(500).json({ message: error.message });
  } finally {
    if (conn && !conn_externa) conn.release();
  }
};
