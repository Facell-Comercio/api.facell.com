const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const {
  checkUserDepartment,
} = require("../../../../helpers/checkUserDepartment");
const {
  checkUserPermission,
} = require("../../../../helpers/checkUserPermission");

module.exports = function reverseManualPayment(req) {
  return new Promise(async (resolve, reject) => {
    const { id } = req.params;
    const { tipo } = req.body;
    let conn;
    const tabela =
      tipo === "vencimento"
        ? "fin_cp_titulos_vencimentos"
        : "fin_cartoes_corporativos_faturas";

    try {
      conn = await db.getConnection();
      if (!id) {
        throw new Error("ID não informado!");
      }
      if (!tipo) {
        throw new Error("Tipo não informado!");
      }

      await conn.beginTransaction();

      let rowItemPagamento;
      if (tipo === "vencimento") {
        const [rowVencimento] = await conn.execute(
          `
              SELECT 
                tv.tipo_baixa, tv.data_pagamento, tv.id_titulo, tv.valor as valor_pagamento,
                bi.remessa, cbi.id as conciliado
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_bordero_itens bi ON bi.id_vencimento = tv.id
              LEFT JOIN fin_conciliacao_bancaria_itens cbi
                ON cbi.id_item = tv.id
                AND cbi.tipo = 'pagamento'
              WHERE tv.id = ?
            `,
          [id]
        );
        rowItemPagamento = rowVencimento;
      }
      if (tipo === "fatura") {
        [rowFatura] = await conn.execute(
          `
              SELECT 
                ccf.tipo_baixa, ccf.data_pagamento, ccf.id_titulo, ccf.valor as valor_pagamento,
                bi.remessa, cbi.id as conciliado
              FROM fin_cartoes_corporativos_faturas ccf
              LEFT JOIN fin_cp_bordero_itens bi ON bi.id_fatura = ccf.id
              LEFT JOIN fin_conciliacao_bancaria_itens cbi 
                ON cbi.id_item = ccf.id
                AND cbi.tipo = 'fatura'
              WHERE ccf.id = ?
            `,
          [id]
        );
        rowItemPagamento = rowFatura;
      }
      const {
        tipo_baixa,
        data_pagamento,
        id_titulo,
        valor_pagamento,
        remessa,
        conciliado,
      } = rowItemPagamento && rowItemPagamento[0];

      if (remessa) {
        throw new Error("Não é possível reverter pagamento feito por arquivo de remessa!");
      }
      if (conciliado) {
        throw new Error("Pagamento já foi conciliado!");
      }
      if (!checkUserDepartment(req, "FINACEIRO", true) && !checkUserPermission(req, "MASTER")) {
        throw new Error("Você não tem permissão para desfazer o pagamento!");
      }
      if (!rowItemPagamento.length) {
        throw new Error("Item não existente!");
      }
      if (!data_pagamento) {
        throw new Error("Item não pago!");
      }

      if (tipo_baixa !== "PARCIAL") {
        await conn.execute(
          `
            UPDATE ${tabela} SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, status = ?, obs = ? WHERE id = ?
          `,
          [null, null, null, "pendente", null, id]
        );
      } else {
        //* Esse caso só se aplica aos vencimentos
        async function verificarVencimentosParciais(vencimentoId) {
          let valor = parseFloat(valor_pagamento);
          const [rowItemPagamentosParciais] = await conn.execute(
            `
              SELECT id, data_pagamento, tipo_baixa, valor
              FROM fin_cp_titulos_vencimentos 
              WHERE vencimento_origem = ? 
              `,
            [vencimentoId]
          );

          const vencimentoParcial =
            rowItemPagamentosParciais && rowItemPagamentosParciais[0];

          const [rowVencimentoOrigemParciais] = await conn.execute(
            `
              SELECT data_pagamento
              FROM fin_cp_titulos_vencimentos 
              WHERE id = ?
              AND data_pagamento IS NOT NULL
              `,
            [vencimentoParcial.id]
          );

          if (rowVencimentoOrigemParciais.length > 0) {
            throw new Error(
              `Não é possível desfazer o pagamento, pois um pagamento parcial foi feito em ${formatDate(
                rowVencimentoOrigemParciais[0].data_pagamento,
                "dd/MM/yyyy"
              )}. Resolva todos os pagamentos parciais primeiro.`
            );
          }

          // console.log(rowVencimentosParciais);
          valor += parseFloat(vencimentoParcial.valor);

          await conn.execute(
            `
              DELETE FROM fin_cp_titulos_vencimentos WHERE id = ?
              `,
            [vencimentoParcial.id]
          );

          return valor;
        }

        const valorTotal = await verificarVencimentosParciais(id);
        // console.log(`Valor total acumulado: ${valorTotal}`);

        await conn.execute(
          `
            UPDATE fin_cp_titulos_vencimentos SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?
          `,
          [null, null, null, valorTotal, "pendente", null, id]
        );
      }

      let itensPagos;
      if (tipo === "vencimento") {
        [itensPagos] = await conn.execute(
          `
              SELECT 
                tv.id, tb.id_bordero 
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
              WHERE tv.id_titulo = ? 
              AND NOT tv.data_pagamento IS NULL
            `,
          [id_titulo]
        );
      }
      if (tipo === "fatura") {
        [itensPagos] = await conn.execute(
          `
              SELECT 
                ccf.id, ccf.id_bordero 
              FROM fin_cartoes_corporativos_faturas ccf
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = ccf.id
              LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id_fatura = ccf.id
              WHERE tv.id_titulo = ? 
              AND NOT tv.data_pagamento IS NULL
            `,
          [id_titulo]
        );
      }

      if (itensPagos === undefined) {
        throw new Error("Houve algum erro na operação");
      }

      if (itensPagos.length === 0) {
        // ^ Se não houverem vencimentos pagos muda o status do título para "aprovado"
        await conn.execute(
          `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
          [3, id_titulo]
        );
      }
      if (itensPagos.length > 1) {
        // ^ Se ainda houverem vencimentos pagos no título muda o status do titulo para pago parcial
        await conn.execute(
          `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
          [4, id_titulo]
        );
      }

      await conn.commit();
      resolve({ message: "Sucesso!" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "BORDERO",
        method: "REVERSE_MANUAL_PAYMENT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
