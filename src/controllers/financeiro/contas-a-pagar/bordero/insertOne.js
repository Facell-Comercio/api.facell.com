const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function insertOne(req) {
    return new Promise(async (resolve, reject) => {
      const { id, id_conta_bancaria, data_pagamento, vencimentos } = req.body;
  
      const conn = await db.getConnection();
      try {
        if (id) {
          throw new Error(
            "Um ID foi recebido, quando na verdade não poderia! Deve ser feita uma atualização do item!"
          );
        }
        await conn.beginTransaction();
  
        const [result] = await conn.execute(
          `INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES (?, ?);`,
          [new Date(data_pagamento), id_conta_bancaria]
        );
  
        const newId = result.insertId;
        if (!newId) {
          throw new Error("Falha ao inserir o rateio!");
        }
  
        // Inserir os itens do bordero
        for (const vencimento of vencimentos) {
          if (vencimento.id_forma_pagamento === 6) {
            const [rowVencimento] = await conn.execute(
              `SELECT id FROM fin_cp_bordero_itens WHERE id_fatura = ?`,
              [vencimento.id_vencimento]
            );
            if (rowVencimento.length === 0) {
              console.log(vencimento.id_vencimento, newId);
              await conn.execute(
                `INSERT INTO fin_cp_bordero_itens (id_fatura, id_bordero) VALUES(?,?)`,
                [vencimento.id_vencimento, newId]
              );
            }
          } else {
            const [rowVencimento] = await conn.execute(
              `SELECT id FROM fin_cp_bordero_itens WHERE id_vencimento = ?`,
              [vencimento.id_vencimento]
            );
            if (rowVencimento.length === 0) {
              await conn.execute(
                `INSERT INTO fin_cp_bordero_itens (id_vencimento, id_bordero) VALUES(?,?)`,
                [vencimento.id_vencimento, newId]
              );
            }
          }
  
          if (vencimento.id_forma_pagamento !== 6) {
            // ^ Atualiza o vencimento com os dados da conciliação
            const isParcial = vencimento.tipo_baixa === "PARCIAL";
            const pago = !!vencimento.tipo_baixa;
            await conn.execute(
              `UPDATE fin_cp_titulos_vencimentos SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?`,
              [
                pago ? new Date(data_pagamento) : null,
                vencimento.tipo_baixa || null,
                vencimento.valor_pago || null,
                isParcial ? vencimento.valor_pago : vencimento.valor_total,
                pago ? "pago" : "pendente",
                pago ? "PAGAMENTO REALIZADO MANUALMENTE" : null,
                vencimento.id_vencimento,
              ]
            );
            //* Realiza a atualização manual do status de remessa
            await conn.execute(
              `
            UPDATE fin_cp_bordero_itens
            SET remessa = ?
            WHERE id_vencimento = ?
          `,
              [!!vencimento.remessa, vencimento.id_vencimento]
            );
  
            //^ Se for com desconto ou acréscimo, devemos aplicar um ajuste nos itens rateados do título:
            if (
              vencimento.tipo_baixa === "COM DESCONTO" ||
              vencimento.tipo_baixa === "COM ACRÉSCIMO"
            ) {
              const [itens_rateio] = await conn.execute(
                `SELECT id FROM fin_cp_titulos_rateio WHERE id_titulo = ?`,
                [vencimento.id_titulo]
              );
              // Aqui obtemos a diferença entre valor pago e valor do vencimento
              const diferenca =
                parseFloat(vencimento.valor_pago) -
                parseFloat(vencimento.valor_total);
              // Aqui geramos a diferença que será acrescida ou descontada de cada item rateio:
              const difAplicada = diferenca / (itens_rateio?.length || 1);
              // Aplicamos a diferença nos itens
              await conn.execute(
                "UPDATE fin_cp_titulos_rateio SET valor = valor + ? WHERE id_titulo = ?",
                [difAplicada, vencimento.id_titulo]
              );
            }
  
            if (vencimento.tipo_baixa === "PARCIAL") {
              const valor =
                parseFloat(vencimento.valor_total) -
                parseFloat(vencimento.valor_pago);
  
              // ^ Baixa parcial -> Cria um novo vencimento
              await conn.execute(
                `
                INSERT INTO fin_cp_titulos_vencimentos (id_titulo, data_vencimento, data_prevista, valor, vencimento_origem) VALUES (?,?,?,?,?)
              `,
                [
                  vencimento.id_titulo,
                  new Date(vencimento.data_prevista_parcial),
                  new Date(vencimento.data_prevista_parcial),
                  valor.toFixed(2),
                  vencimento.id_vencimento,
                ]
              );
            }
            const [vencimentosNaoPagos] = await conn.execute(
              `
              SELECT 
                tv.id, tb.id_bordero 
              FROM fin_cp_titulos_vencimentos tv
              LEFT JOIN fin_cp_bordero_itens tb ON tb.id_vencimento = tv.id
              WHERE tv.id_titulo = ? 
              AND tv.data_pagamento IS NULL
            `,
              [vencimento.id_titulo]
            );
  
            if (pago && vencimentosNaoPagos.length === 0) {
              // ^ Se todos os vencimentos estiverem pagos muda o status do titulo para pago
              await conn.execute(
                `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
                [5, vencimento.id_titulo]
              );
            }
            if (pago && vencimentosNaoPagos.length > 0) {
              // ^ Se houverem vencimentos ainda não pagos no título muda o status do titulo para pago parcial
              await conn.execute(
                `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
                [4, vencimento.id_titulo]
              );
            }
          } else {
            console.log("PAGAMENTO CARTÃO");
            const pago = !!vencimento.tipo_baixa;
            await conn.execute(
              `UPDATE fin_cartoes_corporativos_faturas SET data_pagamento = ?, tipo_baixa = ?, valor_pago = ?, valor = ?, status = ?, obs = ? WHERE id = ?`,
              [
                pago ? new Date(data_pagamento) : null,
                vencimento.tipo_baixa || null,
                vencimento.valor_pago || null,
                vencimento.valor_total,
                pago ? "pago" : "pendente",
                pago ? "PAGAMENTO REALIZADO MANUALMENTE" : null,
                vencimento.id_vencimento,
              ]
            );
            //* Realiza a atualização manual do status de remessa
            console.log(vencimento);
            await conn.execute(
              `
                UPDATE fin_cp_bordero_itens
                SET remessa = ?
                WHERE id_fatura = ?
              `,
              [0, vencimento.id_vencimento]
            );
  
            //* No ato de pagamento
            if (pago) {
              const [rowVencimentosFatura] = await conn.execute(
                `
                SELECT tv.id_titulo FROM fin_cp_titulos_vencimentos tv
                LEFT JOIN fin_cp_titulos t ON t.id = tv.id_titulo 
                WHERE id_fatura = ? 
                AND t.id_status >= 3
              `,
                [vencimento.id_vencimento]
              );
  
              for (const tituloFatura of rowVencimentosFatura) {
                const [vencimentosNaoPagosFatura] = await conn.execute(
                  `
                  SELECT 
                    tv.id, tb.id_bordero 
                  FROM fin_cp_titulos_vencimentos tv
                  LEFT JOIN fin_cp_bordero_itens tb ON tb.id_fatura = tv.id_fatura
                  WHERE tv.id_titulo = ? 
                  AND tv.data_pagamento IS NULL
                `,
                  [tituloFatura.id_titulo]
                );
  
                if (pago && vencimentosNaoPagosFatura.length === 0) {
                  // ^ Se todos os vencimentos estiverem pagos muda o status do titulo para pago
                  await conn.execute(
                    `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
                    [5, tituloFatura.id_titulo]
                  );
                }
                if (pago && vencimentosNaoPagosFatura.length > 0) {
                  // ^ Se houverem vencimentos ainda não pagos no título muda o status do titulo para pago parcial
                  await conn.execute(
                    `UPDATE fin_cp_titulos SET id_status = ? WHERE id = ?`,
                    [4, tituloFatura.id_titulo]
                  );
                }
              }
            }
          }
        }
  
        await conn.commit();
        // await conn.rollback();
        resolve({ message: "Sucesso" });
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "INSERT",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        await conn.rollback();
        reject(error);
      } finally {
        conn.release();
      }
    });
  }
