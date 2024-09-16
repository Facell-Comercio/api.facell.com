const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getAllCaixasComSaldo = require("./getAllCaixasComSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let { id_filial, valor } = req.body;
    const user = req.user;
    let conn;
    try {
      if (!id_filial) {
        throw new Error("ID Filial não informado!");
      }
      if (!valor) {
        throw new Error("Valor não informado!");
      }

      conn = await db.getConnection();
      await conn.beginTransaction();
      const [result] = await conn.execute(
        `INSERT INTO datasys_caixas_boletos (id_filial, id_user, valor) VALUES(?,?,?)`,
        [id_filial, user.id, valor]
      );

      const id_boleto = result.insertId;
      const caixas = await getAllCaixasComSaldo({
        query: {
          id_filial,
          conn_externa: conn,
        },
      });

      for (const caixa of caixas.rows) {
        const rowSaldo = parseFloat(caixa.saldo || "0");

        if (valor > 0) {
          let valorLiquidado = 0;

          if (valor >= rowSaldo) {
            //* Se o valor a ser debitado for maior ou igual ao saldo do caixa
            await conn.execute("UPDATE datasys_caixas SET saldo = 0 WHERE id = ?", [caixa.id]); //* O saldo final do caixa fica 0
            valor -= rowSaldo; //* Subtrai o saldo do caixa do valor total
            valorLiquidado = rowSaldo;
          } else {
            //* Se o valor a ser debitado for menor que o saldo do caixa
            await conn.execute("UPDATE datasys_caixas SET saldo = saldo - ? WHERE id = ?", [
              valor,
              caixa.id,
            ]); //* Subtrai o valor parcial do saldo do caixa
            valorLiquidado = valor;
            valor = 0; //* Todo o valor foi debitado, zera o valor
          }

          //* Cria a tabela de junção do caixa e do boleto
          await conn.execute(
            `INSERT INTO datasys_caixas_boletos_caixas
            (id_boleto, id_caixa, valor) VALUES(?,?,?)`,
            [id_boleto, caixa.id, valorLiquidado.toFixed(2)]
          );
        } else {
          break; //* Se o valor for menor ou igual a zero para a iteração
        }
      }

      await conn.commit();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "LIQUIDAR_CAIXAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
