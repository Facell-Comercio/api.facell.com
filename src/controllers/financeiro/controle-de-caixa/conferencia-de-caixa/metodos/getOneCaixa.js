const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getCaixaAnterior = require("./getCaixaAnterior");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id } = req.params;

    let conn;
    try {
      conn = await db.getConnection();
      const [rowsCaixas] = await conn.execute(
        `
        SELECT
          dc.*, dc.saldo_anterior, dc.saldo as saldo_atual,
          CASE WHEN dc.status = 'CONFIRMADO' || dc.status = 'CONFIRMADO' THEN 1 ELSE 0 END as caixa_confirmado,
          dc.manual,

          (
            SELECT SUM(dcd.valor)
            FROM datasys_caixas_depositos dcd
            WHERE dcd.id_caixa = dc.id
          ) AS valor_depositos,
          (
            SELECT SUM(dcbc.valor)
            FROM datasys_caixas_boletos_caixas dcbc
            INNER JOIN datasys_caixas_boletos dcb ON dcb.id = dcbc.id_boleto
            WHERE dcbc.id_caixa = dc.id
              AND dcb.status <> 'cancelado'
          ) AS valor_boletos,
          (
            SELECT COUNT(dca.id)
            FROM datasys_caixas_ajustes dca
            WHERE dca.id_caixa = dc.id
          ) AS ajustes,
          (
            SELECT COUNT(*)
            FROM datasys_caixas_ocorrencias ocorrencias
            WHERE ocorrencias.id_filial = dc.id_filial
              AND ocorrencias.data_caixa = dc.data
          ) AS ocorrencias,
          (
            SELECT COUNT(*)
            FROM datasys_caixas_ocorrencias ocorrencias
            WHERE ocorrencias.id_filial = dc.id_filial
              AND ocorrencias.data_caixa = dc.data
              AND ocorrencias.resolvida = 1
          ) AS ocorrencias_resolvidas,

          (dc.valor_dinheiro - dc.valor_despesas) as total_dinheiro,
          (dc.valor_cartao_real - dc.valor_cartao) as divergencia_cartao,
          (dc.valor_recarga_real - dc.valor_recarga) as divergencia_recarga,
          (dc.valor_pitzi_real - dc.valor_pitzi) as divergencia_pitzi,
          (dc.valor_pix_banco - dc.valor_pix) as divergencia_pix,
          (dc.valor_tradein_utilizado - dc.valor_tradein) as divergencia_tradein,
          (dc.valor_crediario_real - dc.valor_crediario) as divergencia_crediario,
          f.id_matriz, f.nome as filial
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        WHERE dc.id = ?
        `,
        [id]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      const caixaAnterior = await getCaixaAnterior({
        conn,
        id_filial: caixa.id_filial,
        data_caixa: caixa.data,
      });

      const [rowsMovimentoCaixa] = await conn.execute(
        `
        SELECT 
          dci.id, dci.data, dci.documento, dci.forma_pagamento, 
          dci.tipo_operacao, dci.historico, dci.valor
        FROM datasys_caixas_itens dci
        WHERE dci.id_caixa = ?
        `,
        [id]
      );

      const [rowsDepositosCaixa] = await conn.execute(
        `
        SELECT 
          dcd.id, cc.descricao as conta_bancaria, dcd.comprovante, 
          dcd.valor, dcd.data_deposito, dcd.id_conta_bancaria
        FROM datasys_caixas_depositos dcd
        LEFT JOIN fin_contas_bancarias cc ON cc.id = dcd.id_conta_bancaria
        WHERE dcd.id_caixa = ?
        `,
        [id]
      );

      const [rowsBoletosCaixa] = await conn.execute(
        `
        SELECT 
          dcb.id, dcb.data, dcb.status, dcb.valor as valor_boleto, dcbc.valor as saldo_utilizado
        FROM datasys_caixas_boletos_caixas dcbc
        LEFT JOIN datasys_caixas_boletos dcb ON dcb.id = dcbc.id_boleto
        WHERE dcbc.id_caixa = ? AND dcb.status <> "cancelado"
        `,
        [id]
      );

      const [historico] = await conn.execute(
        `
        SELECT 
          dch.*
        FROM datasys_caixas_historico dch
        WHERE dch.id_caixa = ?
        ORDER BY id DESC
        `,
        [id]
      );

      const caixa_anterior_fechado = !caixaAnterior
        ? true
        : caixaAnterior?.status === "CONFIRMADO" || caixaAnterior?.status === "CONFIRMADO";

      resolve({
        ...caixa,
        movimentos_caixa: rowsMovimentoCaixa,
        depositos_caixa: rowsDepositosCaixa,
        qtde_depositos_caixa: rowsDepositosCaixa && rowsDepositosCaixa.length,
        boletos_caixa: rowsBoletosCaixa,
        qtde_boletos_caixa: rowsBoletosCaixa && rowsBoletosCaixa.length,
        historico,
        caixa_anterior_fechado,
      });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "GET_ONE",
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
