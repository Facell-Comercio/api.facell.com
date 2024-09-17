const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const { pagarVencimento } = require("../../../contas-a-pagar/bordero/pagamentoItens");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id_titulo, data_caixa, id_conta_bancaria, id_despesa } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      if (!id_titulo) {
        throw new Error("ID do título é obrigatório");
      }
      if (!id_conta_bancaria) {
        throw new Error("ID da conta bancária é obrigatório");
      }
      if (!data_caixa) {
        throw new Error("Data do caixa é obrigatório");
      }

      let id_bordero;
      const [rowsBorderos] = await conn.execute(
        "SELECT id FROM fin_cp_bordero WHERE id_conta_bancaria = ? AND data_pagamento = ?",
        [id_conta_bancaria, data_caixa]
      );
      const bordero = rowsBorderos && rowsBorderos[0];
      if (!bordero) {
        const [result] = await conn.execute(
          "INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES(?,?)",
          [data_caixa, id_conta_bancaria]
        );
        id_bordero = result.insertId;
      } else {
        id_bordero = bordero.id;
      }

      await conn.execute("UPDATE fin_cp_titulos SET id_status = 3 WHERE id = ?", [id_titulo]);
      await conn.execute(
        "UPDATE fin_cp_titulos_vencimentos SET tipo_baixa = 'PADRÃO' WHERE id_titulo = ?",
        [id_titulo]
      );

      const [rowsVencimentos] = await conn.execute(
        `SELECT 
          *, id as id_vencimento, valor as valor_total, valor as valor_pago
        FROM fin_cp_titulos_vencimentos
        WHERE id_titulo = ?`,
        [id_titulo]
      );
      console.log(rowsVencimentos);
      for (const vencimento of rowsVencimentos) {
        await conn.execute(
          "INSERT INTO fin_cp_bordero_itens (id_vencimento, id_bordero) VALUES(?,?)",
          [vencimento.id_vencimento, id_bordero]
        );
        await pagarVencimento({
          user,
          conn,
          vencimento: vencimento,
          data_pagamento: data_caixa,
          obs: "PAGAMENTO REALIZADO NO LANÇAMENTO DE DESPESA",
        });
      }

      await conn.execute("UPDATE datasys_caixas_itens SET id_cp_titulo = ? WHERE id = ?", [
        id_titulo,
        id_despesa,
      ]);

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "LANCAMENTO_DESPESA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
