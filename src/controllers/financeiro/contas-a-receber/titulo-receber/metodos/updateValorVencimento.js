const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { normalizeNumberFixed } = require("../../../../../helpers/mask");

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    const { id, valor, conn_externa } = req.body || {};
    let conn;
    try {
      conn = conn_externa || (await db.getConnection());

      if (!conn_externa) {
        await conn.beginTransaction();
      }

      // ^ Validações
      if (!id) {
        throw new Error("ID do vencimento não informado!");
      }
      if (!valor) {
        throw new Error("Valor do vencimento atualizado não informado!");
      }

      const [rowVencimento] = await conn.execute(
        "SELECT * FROM fin_cr_titulos_vencimentos WHERE id = ?",
        [id]
      );
      const vencimento = rowVencimento && rowVencimento[0];
      if (!vencimento) {
        throw new Error("Vencimento não encontrado!");
      }

      const valorVencimento = normalizeNumberFixed(vencimento.valor, 2);
      const valorPago = normalizeNumberFixed(vencimento.valor_pago, 2);
      const valorFinalVencimento = valorPago + normalizeNumberFixed(valor, 2);

      const isRetirada = valor < 0;

      if (!isRetirada && valorVencimento < valorFinalVencimento) {
        throw new Error("Valor do pagamento ultrapassa o valor já pago do vencimento!");
      }

      const [rowTitulo] = await conn.execute("SELECT * FROM fin_cr_titulos WHERE id = ?", [
        vencimento.id_titulo,
      ]);
      const titulo = rowTitulo && rowTitulo[0];
      if (!titulo) {
        throw new Error("Título não encontrado!");
      }
      if (titulo.id_status >= 50) {
        throw new Error("Alteração rejeitada pois o título já consta como pago!");
      }
      if (titulo.id_status < 30) {
        throw new Error("Alteração rejeitada pois o título ainda não foi emitido!");
      }

      await conn.execute(
        "UPDATE fin_cr_titulos_vencimentos SET valor_pago = valor_pago + ? WHERE id =?",
        [valor, id]
      );

      const isParcial = valorVencimento > valorFinalVencimento;
      const isPago = valorVencimento === valorFinalVencimento;

      //* VENCIMENTO PAGO PARCIAL
      if (!isRetirada && isParcial) {
        await conn.execute(
          "UPDATE fin_cr_titulos_vencimentos SET status = 'pago parcial' WHERE id =?",
          [id]
        );
        await conn.execute("UPDATE fin_cr_titulos SET id_status = 40 WHERE id = ?", [titulo.id]);
      }

      //* VENCIMENTO PAGO
      if (!isRetirada && isPago) {
        await conn.execute("UPDATE fin_cr_titulos_vencimentos SET status = 'pago' WHERE id =?", [
          id,
        ]);

        //* VENCIMENTOS A PAGAR NO TÍTULO
        const [rowVencimentosAPagar] = await conn.execute(
          `SELECT * FROM fin_cr_titulos_vencimentos
            WHERE id_titulo = ?
            AND ROUND(valor,2) <> ROUND(valor_pago,2)`,
          [titulo.id]
        );

        if (rowVencimentosAPagar.length > 0) {
          //* SE HÁ VENCIMENTOS A PAGAR - STATUS PAGO PARCIAL
          await conn.execute("UPDATE fin_cr_titulos SET id_status = 40 WHERE id =?", [titulo.id]);
        } else {
          //* SE NÃO HÁ VENCIMENTOS A PAGAR - STATUS PAGO
          await conn.execute("UPDATE fin_cr_titulos SET id_status = 50 WHERE id =?", [titulo.id]);
        }
      }

      //* RETIRADA DE VALOR DO VENCIMENTO
      if (isRetirada) {
        const absNumber = Math.abs(normalizeNumberFixed(valor, 2));

        //* RETIRADA DO TOTAL DO VENCIMENTO
        if (valorPago === absNumber) {
          await conn.execute(
            "UPDATE fin_cr_titulos_vencimentos SET status = 'pendente' WHERE id =?",
            [id]
          );
        }

        //* RETIRADA DE PARTE DO VALOR DO VENCIMENTO
        if (valorPago > absNumber) {
          await conn.execute(
            "UPDATE fin_cr_titulos_vencimentos SET status = 'pago parcial' WHERE id =?",
            [id]
          );
        }

        //* VENCIMENTOS PAGOS NO TÍTULO
        const [rowVencimentosPagos] = await conn.execute(
          `SELECT id FROM fin_cr_titulos_vencimentos
            WHERE id_titulo = ?
            AND valor_pago > 0`,
          [titulo.id]
        );

        if (rowVencimentosPagos.length > 0) {
          //* SE HÁ VENCIMENTOS PAGOS - STATUS PAGO PARCIAL
          await conn.execute("UPDATE fin_cr_titulos SET id_status = 40 WHERE id =?", [titulo.id]);
        } else {
          //* SE NÃO HÁ VENCIMENTOS PAGOS - STATUS EMITIDO
          await conn.execute("UPDATE fin_cr_titulos SET id_status = 30 WHERE id =?", [titulo.id]);
        }
      }

      if (!conn_externa) {
        await conn.commit();
      }
      resolve();
    } catch (error) {
      console.log(error);

      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "UPDATE_VALOR_VENCIMENTO",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  });
};
