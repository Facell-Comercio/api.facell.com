const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function getOneByTimParams(req) {
    return new Promise(async (resolve, reject) => {
      const { num_doc, cnpj_fornecedor } = req.query;
  
      // console.log(req.params)
      const conn = await db.getConnection();
      try {
        if (!num_doc) {
          throw new Error("Número da nota fiscal não informado!");
        }
        if (!cnpj_fornecedor) {
          throw new Error("CNPJ do fornecedor não informado!");
        }
  
        const numDoc = parseInt(num_doc);
        const cnpjFornecedor = parseInt(cnpj_fornecedor);
  
        const [rowTitulo] = await conn.execute(
          `
          SELECT t.*, st.status,
                  f.nome as filial,
                  f.id_grupo_economico,
                  f.id_matriz,
                  fb.nome as banco,
                  fb.codigo as codigo_banco,
                  fo.nome as nome_fornecedor, 
                  fo.cnpj as cnpj_fornecedor,
                  COALESCE(fr.manual, TRUE) as rateio_manual
  
              FROM fin_cp_titulos t 
              INNER JOIN fin_cp_status st ON st.id = t.id_status
              LEFT JOIN fin_bancos fb ON fb.id = t.id_banco
              LEFT JOIN filiais f ON f.id = t.id_filial
              LEFT JOIN 
                  fin_fornecedores fo ON fo.id = t.id_fornecedor
              LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
              WHERE 
              CAST(t.num_doc AS UNSIGNED) = ? 
              AND CAST(fo.cnpj AS UNSIGNED) = ?
              `,
          [numDoc, cnpjFornecedor]
        );
        const titulo = (rowTitulo && rowTitulo[0]) || null;
  
        if (!titulo) {
          resolve(null);
          return;
        }
  
        const [vencimentos] = await conn.execute(
          `SELECT 
            tv.id, tv.data_vencimento, tv.data_prevista, tv.valor, tv.cod_barras 
          FROM fin_cp_titulos_vencimentos tv 
          WHERE tv.id_titulo = ? 
          `,
          [titulo.id]
        );
  
        const [itens_rateio] = await conn.execute(
          `SELECT 
            tr.*,
            f.nome as filial,
            fcc.nome  as centro_custo,
            CONCAT(fpc.codigo, ' - ', fpc.descricao) as plano_conta, 
            FORMAT(tr.percentual * 100, 2) as percentual
          FROM 
            fin_cp_titulos_rateio tr 
          LEFT JOIN filiais f ON f.id = tr.id_filial
          LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
            WHERE tr.id_titulo = ?`,
          [titulo.id]
        );
  
        const [historico] = await conn.execute(
          `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
          [titulo.id]
        );
  
        // console.log(titulo)
        const objResponse = { titulo, vencimentos, itens_rateio, historico };
        resolve(objResponse);
        return;
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "GET_ONE_BY_TIM_PARAMS",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        reject(error);
        return;
      } finally {
        conn.release();
      }
    });
  }