const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");
const { startOfDay } = require("date-fns");

module.exports = function update(req) {
    return new Promise(async (resolve, reject) => {
      const { id, id_conta_bancaria, data_pagamento, itens } = req.body;
      const conn = await db.getConnection();
      try {
        if (!id) {
          throw new Error("ID não informado!");
        }
        if (!id_conta_bancaria) {
          throw new Error("ID_CONTA_BANCARIA não informado!");
        }
        if (!data_pagamento) {
          throw new Error("DATA_PAGAMENTO não informada!");
        }
  
        await conn.beginTransaction();
  
        const [rowBordero] = await conn.execute(
          `SELECT data_pagamento FROM fin_cp_bordero WHERE id =?`,
          [id]
        );
        const bordero = rowBordero && rowBordero[0];
  
        const [rowVencimentosPagos] = await conn.execute(
          `
          SELECT tv.id FROM fin_cp_bordero_itens tb
          LEFT JOIN fin_cp_titulos_vencimentos tv ON tv.id = tb.id_vencimento
          WHERE tb.id_bordero = ? 
          AND tv.data_pagamento IS NOT NULL
          OR tb.remessa`,
          [id]
        );
  
        const vencimentosPagos =
          (rowVencimentosPagos && rowVencimentosPagos[0]) || [];
  
        const [rowFaturasPagas] = await conn.execute(
          `
            SELECT ccf.id FROM fin_cp_bordero_itens bi
            LEFT JOIN fin_cartoes_corporativos_faturas ccf ON ccf.id = bi.id_fatura
            WHERE bi.id_bordero = ? 
            AND ccf.data_pagamento IS NOT NULL
            OR bi.remessa`,
          [id]
        );
  
        const faturasPagas = (rowFaturasPagas && rowFaturasPagas[0]) || [];
  
        if (!bordero) {
          throw new Error("Borderô inexistente!");
        }
        const data_pagamento_anterior = bordero.data_pagamento;
  
        //* Apenas atualizar o bordero e data prevista dos vencimentos se não houverem vencimentos pagos
        if (vencimentosPagos.length === 0 && faturasPagas.length === 0) {
          // Update do bordero
          await conn.execute(
            `UPDATE fin_cp_bordero SET data_pagamento = ?, id_conta_bancaria = ? WHERE id =?`,
            [startOfDay(data_pagamento), id_conta_bancaria, id]
          );
  
          if (
            startOfDay(data_pagamento).toDateString() !=
            startOfDay(data_pagamento_anterior).toDateString()
          ) {
            // Update vencimentos do bordero igualando a data_prevista à data_pagamento do bordero
            await conn.execute(
              `
              UPDATE fin_cp_titulos_vencimentos 
              SET data_prevista = ? 
              WHERE id IN (
                SELECT id_vencimento FROM fin_cp_bordero_itens WHERE id_bordero = ?
              )`,
              [startOfDay(data_pagamento), id]
            );
            // Update faturas do bordero igualando a data_prevista à data_pagamento do bordero
            await conn.execute(
              `
              UPDATE fin_cartoes_corporativos_faturas
              SET data_prevista = ? 
              WHERE id IN (
                SELECT id_fatura FROM fin_cp_bordero_itens WHERE id_bordero = ?
              )`,
              [startOfDay(data_pagamento), id]
            );
          }
        }
  
        // Inserir os itens do bordero
        for (const item of itens) {
          if (item.id_forma_pagamento === 6) {
            const [rowItemBordero] = await conn.execute(
              `SELECT id FROM fin_cp_bordero_itens WHERE id_fatura = ?`,
              [item.id_vencimento]
            );
            if (rowItemBordero.length === 0) {
              await conn.execute(
                `INSERT INTO fin_cp_bordero_itens (id_fatura, id_bordero) VALUES(?,?)`,
                [item.id_vencimento, id]
              );
            }
          } else {
            const [rowItemBordero] = await conn.execute(
              `SELECT id FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
              [item.id_vencimento]
            );
            if (rowItemBordero.length === 0) {
              await conn.execute(
                `INSERT INTO fin_cp_bordero_itens (id_vencimento, id_bordero) VALUES(?,?)`,
                [item.id_vencimento, id]
              );
            }
          }
        }
  
        await conn.commit();
        // await conn.rollback();
        resolve({ message: "Sucesso!" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "UPDATE",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }