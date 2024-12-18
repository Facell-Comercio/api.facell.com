const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    // console.log(req.params)
    let conn;
    try {
      conn = await db.getConnection();
      const { id } = req.params;

      const [rowTitulo] = await conn.execute(
        `
          SELECT 
            t.*, st.status,
            f.nome as filial,
            f.id_grupo_economico,
            f.id_matriz,
            ROUND(ir / valor * 100, 2) as ir_percent,
            ROUND(iss / valor * 100, 2)as iss_percent,

            -- Fornecedor:
            fo.nome as nome_fornecedor,
            fo.cnpj as cnpj_fornecedor,

            COALESCE(fr.manual, TRUE) as rateio_manual
          FROM fin_cr_titulos t
          INNER JOIN fin_cr_status st ON st.id = t.id_status
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN
              fin_fornecedores fo ON fo.id = t.id_fornecedor
          LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
          WHERE t.id = ?
              `,
        [id]
      );

      const [vencimentos] = await conn.execute(
        `SELECT 
          tv.*
        FROM fin_cr_titulos_vencimentos tv
          WHERE tv.id_titulo = ?
          `,
        [id]
      );

      const [itens_rateio] = await conn.execute(
        `SELECT 
            tr.*,
            f.nome as filial,
            fcc.nome  as centro_custo,
            CONCAT(fpc.codigo, ' - ', fpc.descricao) as plano_conta,
            ROUND(tr.valor, 4) as valor, 
            ROUND(tr.percentual * 100, 4) as percentual
          FROM 
            fin_cr_titulos_rateio tr
          LEFT JOIN filiais f ON f.id = tr.id_filial
          LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
            WHERE tr.id_titulo = ?`,
        [id]
      );

      const [historico] = await conn.execute(
        `SELECT * FROM fin_cr_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
        [id]
      );

      const titulo = rowTitulo && rowTitulo[0];
      // console.log(titulo)
      const objResponse = { titulo, vencimentos, itens_rateio, historico };

      resolve(objResponse);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "GET_ONE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    } finally {
      if (conn) conn.release();
    }
  });
};
