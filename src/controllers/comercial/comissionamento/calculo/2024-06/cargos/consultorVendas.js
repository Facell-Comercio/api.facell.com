"use strict";
const { logger } = require('../../../../../../../logger');
const { db } = require('../../../../../../../mysql');
module.exports = ({ ref, meta, politica }) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    // console.log('[START_CALC_CONSULTOR]', meta.nome)
    const espelho = {
      filial,
      nome,
      cargo,
      data_inicial,
      data_final,
      proporcional,
      parametros: [],
      itens,
    }

    try {
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

      meta.data_inicial = formatarValor(meta.data_inicial, "data");
      meta.data_final = formatarValor(meta.data_final, "data");

      espelho.cpf = meta.cpf;
      espelho.cargo = meta.cargo;
      espelho.grupo_economico = meta.grupo_economico;
      espelho.filial = meta.filial;
      espelho.nome = meta.nome;
      espelho.data_inicial = meta.data_inicial;
      espelho.data_final = meta.data_final;

      // * EXCEÇÕES - OUTROS RECEBIMENTOS/PAGAMENTOS [recordes, contestações]
      const excecoes = await getExcecoes({ meta })

      if (excecoes && excecoes.length > 0) {
        excecoes.forEach((excecao) => {
          const valor_inicial = parseFloat(excecao.valor);
          const isNegative = valor_inicial < 0 ? true : false;

          if (!isNegative) {
            let valor = valor_inicial * (espelho.qualidade ? espelho.qualidade : 1) * (espelho.deflatores.app_e_esteira ? 0.5 : 1)
            espelho.bonus += valor;
          } else {
            let valor = Math.abs(valor_inicial)

            // Descontar do bônus
            if (espelho.bonus >= valor) {
              espelho.bonus -= valor;
              valor = 0;
            } else {
              valor -= espelho.bonus;
              espelho.bonus = 0
            }

            // Descontar da comissão
            if (espelho.comissao >= valor) {
              espelho.comissao -= valor;
              valor = 0;
            } else {
              valor -= espelho.comissao;
              espelho.comissao = 0
            }
          }

        });
      }

      try {
        // Buscar se já existe o espelho, se existir, então excluir o pdf e o registro:
        const [rowEspelhoAntigo] = await conn.execute(
          `SELECT fileUrl FROM comissao_espelhos WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
          [ref, espelho.filial, espelho.cpf, espelho.cargo]
        );

        if (
          rowEspelhoAntigo &&
          rowEspelhoAntigo[0]
        ) {

          await conn.execute(
            `UPDATE comissao 
            SET 
              updated = now(),
              nome = ${conn.escape(espelho.nome)}, 
              comissao = ${conn.escape(espelho.comissao)}, 
              bonus = ${conn.escape(espelho.bonus)}, 
              fileUrl = ${conn.escape(fileUrl)}

            WHERE ref = ? and filial = ? and cpf = ? and cargo = ?`,
            [ref, espelho.filial, espelho.cpf, espelho.cargo]
          );
        } else {
          // Vamos inserir já que não existe:
          await conn.execute(
            `INSERT INTO comissao (
          ref, ciclo, filial, cpf, nome, cargo, comissao, bonus, fileUrl
          ) VALUES (
          ?, ?, ? ,? ,?, ?, ?, ?, ?
        );`,
            [
              ref,
              espelho.ciclo,
              espelho.filial,
              espelho.cpf,
              espelho.nome,
              espelho.cargo,
              espelho.comissao,
              espelho.bonus,
              fileUrl,
            ]
          );
        }
        await conn.execute(`UPDATE metas SET status_espelho = 'Calculado', obs_espelho = '' WHERE id = ? `, [meta.id])

        resolve({ success: true });
        return true;
      } catch (error) {

        reject("[INSERT/UPDATE]:" + error.message);
        return false;
      }

    } catch (error) {
      logger.error({
        module: 'COMISSÃO', origin: 'CÁLCULO', method: 'CONSULTOR_DE_VENDAS',
        data: { stack: error.stack, name: error.name, message: error.message }
      })
      try {
        if (conn) await conn.execute(`UPDATE metas SET status_espelho = 'Erro', obs_espelho = ? WHERE id = ? `, [error.message, meta.id])
      } catch (error) {
        logger.error({
          module: 'COMISSÃO', origin: 'CÁLCULO', method: 'CONSULTOR_DE_VENDAS',
          data: { stack: error.stack, name: error.name, message: error.message }
        })
      }
      if (conn) conn.rollback();
      return reject("[CÁLCULO]:" + error.message);;
    } finally {
      if (conn) conn.release();
    }
  });
};
