const { logger } = require("../../../../../logger");
const { db } = require("../../../../../mysql");
const { pagarVencimento } = require("../../contas-a-pagar/bordero/pagamentoItens");
const updateSaldoContaBancaria = require("./updateSaldoContaBancaria");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    const { id_extrato_bancario, id_titulo } = req.body;

    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }

    let conn;
    try {
      if (!id_extrato_bancario) {
        throw new Error("ID do extrato bancário não informado!");
      }
      if (!id_titulo) {
        throw new Error("ID do título não informado!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();

      const [rowExtratoBancario] = await conn.execute(
        "SELECT * FROM fin_extratos_bancarios WHERE id = ?",
        [id_extrato_bancario]
      );
      const extratoBancario = rowExtratoBancario && rowExtratoBancario[0];

      const [rowTituloPagar] = await conn.execute(
        "SELECT id, valor FROM fin_cp_titulos WHERE id = ?",
        [id_titulo]
      );

      if (rowTituloPagar.length > 1) {
        throw new Error("Título com mais de 1 vencimento");
      }

      const tituloPagar = rowTituloPagar && rowTituloPagar[0];

      const id_conta_bancaria = extratoBancario.id_conta_bancaria;
      const valor_titulo = parseFloat(tituloPagar.valor);
      const valor_extrato = Math.abs(parseFloat(extratoBancario.valor));
      const data_adiantamento = extratoBancario.data_transacao;

      if (valor_extrato < valor_titulo) {
        throw new Error(
          "Não é possível vincular com este título, valor superior ao do adiantamento"
        );
      }

      //* ATUALIZA O VALOR DO SALDO DA CONTA BANCÁRIA
      const valorAtualizado = valor_extrato - valor_titulo;
      await updateSaldoContaBancaria({
        body: {
          id_conta_bancaria,
          valor: valorAtualizado,
          conn_externa: conn,
        },
      });

      //* UPDATE EXTRATO BANCÁRIO
      await conn.execute(
        `UPDATE fin_extratos_bancarios SET valor = ?, adiantamento = 1, id_titulo_adiantamento = ? WHERE id = ?`,
        [-valor_titulo, id_titulo, id_extrato_bancario]
      );

      //* CRIAÇÃO/CONSULTA DO BORDERÔ USADO PARA O TÍTULO
      let id_bordero;
      const [rowsBorderos] = await conn.execute(
        "SELECT id FROM fin_cp_bordero WHERE id_conta_bancaria = ? AND data_pagamento = ?",
        [id_conta_bancaria, data_adiantamento]
      );
      const bordero = rowsBorderos && rowsBorderos[0];
      if (!bordero) {
        const [result] = await conn.execute(
          "INSERT INTO fin_cp_bordero (data_pagamento, id_conta_bancaria) VALUES(?,?)",
          [data_adiantamento, id_conta_bancaria]
        );
        id_bordero = result.insertId;
      } else {
        id_bordero = bordero.id;
      }

      //* ATUALIZAÇÃO DO TÍTULO E DO VENCIMENTO
      await conn.execute("UPDATE fin_cp_titulos SET id_status = 3 WHERE id = ?", [id_titulo]);
      await conn.execute(
        `UPDATE fin_cp_titulos_vencimentos
         SET tipo_baixa = 'PADRÃO', data_vencimento = ?, data_prevista = ?
         WHERE id_titulo = ?`,
        [data_adiantamento, data_adiantamento, id_titulo]
      );

      //* PAGAMENTO DOS VENCIMENTOS
      const [rowsVencimentos] = await conn.execute(
        `SELECT 
          *, id as id_vencimento, valor as valor_total, valor as valor_pago
        FROM fin_cp_titulos_vencimentos
        WHERE id_titulo = ?`,
        [id_titulo]
      );

      for (const vencimento of rowsVencimentos) {
        await conn.execute(
          "INSERT INTO fin_cp_bordero_itens (id_vencimento, id_bordero) VALUES(?,?)",
          [vencimento.id_vencimento, id_bordero]
        );
        await pagarVencimento({
          user,
          conn,
          vencimento: vencimento,
          data_pagamento: data_adiantamento,
          obs: "PAGAMENTO REALIZADO NA VINCULAÇÃO COM O ADIANTAMENTO",
        });
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TESOURARIA",
        method: "VINCULAR_ADIANTAMENTO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
