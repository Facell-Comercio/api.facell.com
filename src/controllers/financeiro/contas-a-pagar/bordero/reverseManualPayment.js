const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function reverseManualPayment(req) {
    return new Promise(async (resolve, reject) => {
      const { id } = req.params;
      const conn = await db.getConnection();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
  
        await conn.beginTransaction();
  
        const [rowVencimento] = await conn.execute(
          `
            SELECT tipo_baixa, data_pagamento, id_titulo, valor as valor_vencimento FROM fin_cp_titulos_vencimentos WHERE id = ?
          `,
          [id]
        );
        const { tipo_baixa, data_pagamento, id_titulo, valor_vencimento } =
          rowVencimento && rowVencimento[0];
        if (!rowVencimento.length) {
          throw new Error("Vencimento não existente!");
        }
        if (!data_pagamento) {
          throw new Error("Vencimento não pago!");
        }
  
        if (tipo_baixa !== "PARCIAL") {
          await conn.execute(
            `
            UPDATE fin_cp_titulos_vencimentos SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, status = ?, obs = ? WHERE id = ?
          `,
            [null, null, null, "pendente", null, id]
          );
        } else {
          async function verificarVencimentosParciais(vencimentoId) {
            let valor = parseFloat(valor_vencimento);
            const [rowVencimentosParciais] = await conn.execute(
              `
              SELECT id, data_pagamento, tipo_baixa, valor
              FROM fin_cp_titulos_vencimentos 
              WHERE vencimento_origem = ? 
              `,
              [vencimentoId]
            );
  
            const vencimentoParcial =
              rowVencimentosParciais && rowVencimentosParciais[0];
  
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
  
        const [vencimentosPagos] = await conn.execute(
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
  
        if (vencimentosPagos.length === 0) {
          // ^ Se não houverem vencimentos pagos muda o status do título para "aprovado"
          await conn.execute(
            `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
            [3, id_titulo]
          );
        }
        if (vencimentosPagos.length > 1) {
          // ^ Se ainda houverem vencimentos pagos no título muda o status do titulo para pago parcial
          await conn.execute(
            `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
            [4, id_titulo]
          );
        }
        await conn.commit();
        // await conn.rollback();
        resolve({ message: "Sucesso!" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "REVERSE_MANUAL_PAYMENT",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }