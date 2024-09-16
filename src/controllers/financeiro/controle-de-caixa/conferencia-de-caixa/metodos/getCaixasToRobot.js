const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { filters } = req.query;

    const { id_filial, id_grupo_economico } = filters || {};

    const paramsFiliais = [];
    let whereFiliais = "";

    if (id_grupo_economico && id_grupo_economico !== "all") {
      whereFiliais += " AND g.id = ?";
      paramsFiliais.push(id_grupo_economico);
    }
    if (id_filial && id_filial !== "all") {
      whereFiliais += " AND f.id = ?";
      paramsFiliais.push(id_filial);
    }
    let conn;
    try {
      conn = await db.getConnection();
      const filiais = [];

      const [rowsFiliais] = await conn.execute(
        `
        SELECT f.id, f.nome, g.nome as grupo_economico  
        FROM filiais f 
        INNER JOIN grupos_economicos g ON g.id = f.id_grupo_economico
        WHERE f.cnpj_datasys IS NOT NULL and f.active = 1 ${whereFiliais}
      `,
        paramsFiliais
      );

      for (const filialBanco of rowsFiliais) {
        let filial = {
          filial: filialBanco,
        };
        const [caixas] = await conn.execute(
          `
          SELECT 
            caixa.*
          FROM datasys_caixas caixa
          WHERE 
            caixa.status = 'CONFIRMADO'
            AND caixa.id_filial = ${filialBanco.id}
          ORDER BY caixa.data ASC
          `
        );

        filial.caixas = caixas;

        for (const caixa of caixas) {
          const [depositos] = await conn.execute(
            `
            SELECT 
              deposito.id, 
              conta_bancaria.descricao as conta_bancaria, 
              deposito.comprovante, 
              deposito.valor, 
              deposito.data_deposito
            FROM 
              datasys_caixas_depositos deposito
            LEFT JOIN 
              fin_contas_bancarias conta_bancaria ON conta_bancaria.id = deposito.id_conta_bancaria
            WHERE 
              deposito.id_caixa = ?
            `,
            [caixa.id]
          );

          caixa.depositos = depositos;
        }

        if (filial.caixas) {
          filiais.push(filial);
        }
      }

      resolve(filiais);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_CAIXAS_TO_ROBOT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
