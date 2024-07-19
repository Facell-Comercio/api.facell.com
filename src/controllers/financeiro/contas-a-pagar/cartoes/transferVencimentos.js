const { startOfDay } = require('date-fns');
const { logger } = require('../../../../../logger');
const { db } = require('../../../../../mysql');

module.exports = function transferVencimentos(req) {
  return new Promise(async (resolve, reject) => {
    const { data_vencimento, data_prevista, id_cartao, id_antiga_fatura, ids } =
      req.body;
    const conn = await db.getConnection();
    try {
      if (!data_vencimento) {
        throw new Error('Campo data_vencimento não informado!');
      }
      if (!data_prevista) {
        throw new Error('Campo data_prevista não informado!');
      }
      if (!id_cartao) {
        throw new Error('Campo id_cartao não informado!');
      }
      if (!ids || (ids && ids.length === 0)) {
        throw new Error('Vencimentos não informados!');
      }
      await conn.beginTransaction();

      let id_fatura;
      const [rowFaturas] = await conn.execute(
        `
        SELECT id, closed, status FROM fin_cartoes_corporativos_faturas
        WHERE id_cartao = ? AND data_vencimento = ?`,
        [id_cartao, startOfDay(data_vencimento)]
      );
      const fatura = rowFaturas && rowFaturas[0];
      if (!fatura) {
        const [result] = await conn.execute(
          `
          INSERT INTO fin_cartoes_corporativos_faturas (data_vencimento, id_cartao, data_prevista, valor)
          VALUES (?,?,?,?)
        `,
          [startOfDay(data_vencimento), id_cartao, startOfDay(data_prevista), 0]
        );
        id_fatura = result.insertId;
      } else {
        if (fatura.closed) {
          throw new Error(
            `A fatura de destino da tranferência já está fechada`
          );
        }
        //~ Validar só para ter certeza
        if (fatura.status === 'pago' || fatura.status === 'programado') {
          throw new Error(
            `A fatura de destino da tranferência já foi ${
              fatura.status === 'pago' ? 'paga' : 'programada'
            }`
          );
        }
        id_fatura = fatura.id;
      }
      let valor = 0;
      for (const id of ids) {
        const [rowVencimentos] = await conn.execute(
          `
          SELECT valor FROM fin_cp_titulos_vencimentos WHERE id = ?`,
          [id]
        );
        const vencimento = rowVencimentos && rowVencimentos[0];
        valor += parseFloat(vencimento.valor);
        await conn.execute(
          `UPDATE fin_cp_titulos_vencimentos SET id_fatura = ? WHERE id = ?`,
          [id_fatura, id]
        );
      }

      //* Fatura antiga
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET valor = valor - ? WHERE id = ?`,
        [valor, id_antiga_fatura]
      );
      const [rowFaturaAntiga] = await conn.execute(
        `
        SELECT valor FROM fin_cartoes_corporativos_faturas WHERE id = ?
      `,
        [id_antiga_fatura]
      );
      const faturaAntigaValor = rowFaturaAntiga && rowFaturaAntiga[0].valor;
      if (faturaAntigaValor < 0) {
        throw new Error('Valor da fatura antiga não pode ser negativo');
      }
      if (faturaAntigaValor == 0) {
        await conn.execute(
          `DELETE FROM fin_cartoes_corporativos_faturas WHERE id = ? LIMIT 1`,
          [id_antiga_fatura]
        );
      }

      //* Fatura nova
      await conn.execute(
        `UPDATE fin_cartoes_corporativos_faturas SET valor = valor + ? WHERE id = ?`,
        [valor, id_fatura]
      );

      await conn.commit();
      resolve({ message: 'Sucesso!' });
      return;
    } catch (error) {
      logger.error({
        module: 'FINANCEIRO',
        origin: 'CARTÕES',
        method: 'TRANSFER_VENCIMENTOS',
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      await conn.rollback();
      reject(error);
      return;
    } finally {
      conn.release();
    }
  });
};
