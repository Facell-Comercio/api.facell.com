"use strict";
const { logger } = require('../../../../../../../logger');
const { db } = require('../../../../../../../mysql');
const getPolitica = require('../helper/getPolitica');
const segmentos = require('../segmentos');

module.exports = ({ meta }) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    console.log('[START_CALC_CONSULTOR]', meta.nome)
    try {
      const espelho = {
        ...meta,
        parametros: [],
        itens: [],
      }
      conn = await db.getConnection();

      if (!meta) {
        throw new Error("Meta não localizada!");
      }
      if (!meta.ciclo) {
        throw new Error("Ciclo não informado!");
      }
      if (!meta.ref) {
        throw new Error("Referência não informada!");
      }
      if (!meta.cpf) {
        throw new Error("CPF não informado!");
      }

      const novosItens = await getPolitica({ meta });
      for(const novoItem of novosItens){
        let segmento = segmentos[novoItem.segmento_key];
        console.log(segmento)
      }
      throw new Error('Forced to end')


      // Buscar se já existe o espelho, se existir, então update:
      const [rowEspelhoAntigo] = await conn.execute(
        `SELECT id FROM comissao_espelhos WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
        [ref, espelho.filial, espelho.cpf, espelho.cargo]
      );
      const espelhoBanco = rowEspelhoAntigo && rowEspelhoAntigo[0]
      if (espelhoBanco) {

        await conn.execute(
          `UPDATE comissao 
            SET 
              updated = now(),
              nome = ${conn.escape(espelho.nome)}, 
              comissao = ${conn.escape(espelho.comissao)}, 
              bonus = ${conn.escape(espelho.bonus)}

            WHERE id = ?`,
          [espelhoBanco.id]
        );

      } else {
        // Vamos inserir já que não existe:
        await conn.execute(
          `INSERT INTO comissao (
          ref, ciclo, filial, cpf, nome, cargo, comissao, bonus
          ) VALUES ( ?, ?, ? ,? ,?, ?, ?, ? );
          ON DUPLICATE KEY UPDATE
            comissao = VALUES(comissao),
            bonus = VALUES(bonus) 
          `,
          [
            ref,
            espelho.ciclo,
            espelho.filial,
            espelho.cpf,
            espelho.nome,
            espelho.cargo,
            espelho.comissao,
            espelho.bonus,
          ]
        );
      }
      await conn.execute(`UPDATE metas SET status_espelho = 'Calculado', obs_espelho = '' WHERE id = ? `, [meta.id])

      resolve({ success: true });
    } catch (error) {
      if (conn) await conn.execute(`UPDATE metas SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, meta.id])

      logger.error({
        module: 'COMISSÃO', origin: 'CÁLCULO', method: 'CONSULTOR_DE_VENDAS',
        data: { stack: error.stack, name: error.name, message: error.message }
      })

      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
