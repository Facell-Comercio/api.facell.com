const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function getOne(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      // console.log(req.params)
      const conn = await db.getConnection();
      try {
        const [rowTitulo] = await conn.execute(
          `
          SELECT 
            t.*, st.status,
            fcc.dia_vencimento as dia_vencimento_cartao,
            fcc.dia_corte as dia_corte_cartao,
            f.nome as filial,
            f.id_grupo_economico,
            f.id_matriz,
            
            -- Fornecedor:
            fo.nome as nome_fornecedor, 
            fo.favorecido as nome_favorecido, 
            fo.cnpj as cnpj_fornecedor,

            -- Dados bancários:
            fb.nome as banco,
            fb.codigo as codigo_banco,
            COALESCE(t.agencia, fo.agencia) as agencia,
            COALESCE(t.dv_agencia, fo.dv_agencia) as dv_agencia,
            COALESCE(t.conta, fo.conta) as conta,
            COALESCE(t.dv_conta, fo.dv_conta) as dv_conta,

            t.id_departamento,
            COALESCE(fr.manual, TRUE) as rateio_manual
          FROM fin_cp_titulos t 
          INNER JOIN fin_cp_status st ON st.id = t.id_status
          LEFT JOIN fin_bancos fb ON fb.id = t.id_banco
          LEFT JOIN filiais f ON f.id = t.id_filial
          LEFT JOIN 
              fin_fornecedores fo ON fo.id = t.id_fornecedor
          LEFT JOIN fin_rateio fr ON fr.id = t.id_rateio
          LEFT JOIN fin_cartoes_corporativos fcc ON fcc.id = t.id_cartao
          WHERE t.id = ?
              `,
          [id]
        );
  
        const [vencimentos] = await conn.execute(
          `SELECT 
            tv.id, tv.data_vencimento, tv.data_prevista, tv.valor, tv.valor_pago, tv.cod_barras, tv.qr_code 
          FROM fin_cp_titulos_vencimentos tv 
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
            fin_cp_titulos_rateio tr 
          LEFT JOIN filiais f ON f.id = tr.id_filial
          LEFT JOIN fin_centros_custo fcc ON fcc.id = tr.id_centro_custo
          LEFT JOIN fin_plano_contas fpc ON fpc.id = tr.id_plano_conta
            WHERE tr.id_titulo = ?`,
          [id]
        );

        const [historico] = await conn.execute(
          `SELECT * FROM fin_cp_titulos_historico WHERE id_titulo = ? ORDER BY created_at DESC`,
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
          origin: "TITULOS A PAGAR",
          method: "GET_ONE",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        reject(error);
        return;
      } finally {
        conn.release();
      }
    });
  }