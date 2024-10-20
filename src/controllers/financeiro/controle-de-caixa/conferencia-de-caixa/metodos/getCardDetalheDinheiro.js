const { formatDate } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id_caixa, type } = req.query;

    let conn;
    try {
      conn = await db.getConnection();
      if (!id_caixa) {
        throw new Error("ID do caixa é obrigatório");
      }
      if (!type) {
        throw new Error("Tipo de detalhe é obrigatório");
      }
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.id as id_caixa, dc.id_filial, dc.data, f.id_grupo_economico, f.nome as filial, f.id_matriz
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        WHERE dc.id = ?
        `,
        [id_caixa]
      );
      const caixa = rowsCaixas && rowsCaixas[0];
      if (!caixa) {
        throw new Error("Caixa não encontrado");
      }

      const [rowsMovimentoCaixa] = await conn.execute(
        `
        SELECT
          id, data,documento, forma_pagamento,
          tipo_operacao, historico,valor, id_cp_titulo
        FROM datasys_caixas_itens dci
        WHERE id_caixa = ?
        AND forma_pagamento = 'DINHEIRO' AND tipo_operacao ${
          type === "entrada" ? "= 'VENDA'" : "LIKE CONCAT('%','DESPESA','%')"
        }
        `,
        [id_caixa]
      );
      const [rowsAjustes] = await conn.execute(
        `
        SELECT 
          id as documento, created_at as data, ${
            type === "entrada" ? "'INCLUSÃO'" : "'RETIRADA'"
          } as tipo_operacao, obs as historico, valor
        FROM datasys_caixas_ajustes
        WHERE id_caixa = ?
        AND ${type === "entrada" ? "entrada" : "saida"} = 'valor_dinheiro'
        AND aprovado
      `,
        [id_caixa]
      );

      resolve({
        ...caixa,
        rows: [...rowsMovimentoCaixa, ...rowsAjustes],
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_CARD_DETALHE_DINHEIRO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
