const { startOfDay } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getCaixaAnterior = require("./getCaixaAnterior");
const updateSaldo = require("./updateSaldo");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    const { user } = req;
    if (!user) {
      reject("Usuário não autenticado!");
      return false;
    }
    const { id, action } = req.body;
    //enum('A CONFERIR','CONFERIDO','CONFIRMADO')
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.status, dc.data, dc.id_filial,
          dc.valor_dinheiro, dc.valor_despesas,
          (
            SELECT COUNT(*)
            FROM datasys_caixas_ocorrencias ocorrencias
            WHERE ocorrencias.id_filial = dc.id_filial
              AND ocorrencias.data_caixa = dc.data
              AND ocorrencias.resolvida = 1
          ) AS ocorrencias_resolvidas,
          (
            SELECT COUNT(*)
            FROM datasys_caixas_ocorrencias ocorrencias
            WHERE ocorrencias.id_filial = dc.id_filial
              AND ocorrencias.data_caixa = dc.data
              AND ocorrencias.resolvida = 0
          ) AS ocorrencias_nao_resolvidas,
          (
            SELECT COUNT(dci.id) 
            FROM datasys_caixas_itens dci 
            WHERE dci.id_caixa = dc.id
              AND dci.tipo_operacao LIKE 'DESPESAS%'
              AND dci.id_cp_titulo IS NULL
          ) AS despesas_nao_lancadas,
          dc.divergente
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        WHERE dc.id = ?
        `,
        [id]
      );
      const caixa = rowsCaixas && rowsCaixas[0];
      //* INÍCIO - CONFERÊNCIA DE CAIXA
      if (action === "conferir") {
        await conn.execute(
          `
          UPDATE datasys_caixas SET status = 'CONFERIDO' WHERE id = ?
        `,
          [id]
        );
        await conn.execute(
          `
          INSERT INTO datasys_caixas_historico (
            id_caixa,
            descricao
          ) VALUES (?,?)
        `,
          [id, `Caixa CONFERIDO por ${user.nome.toUpperCase()}`]
        );
      }
      //* FIM - CONFERÊNCIA DE CAIXA

      //* INÍCIO - CONFIRMAÇÃO DE CAIXA
      if (action === "confirmar") {
        //~~ Validação da quantidade de ocorrências
        if (Number(caixa.ocorrencias_nao_resolvidas) > 0) {
          throw new Error(`Há ${caixa.ocorrencias_nao_resolvidas} ocorrências não resolvidas!`);
        }

        //~~ Validação de divergências + ocorrências
        if (caixa.divergente && !caixa.ocorrencias_resolvidas) {
          throw new Error("Registre uma ocorrência pois o caixa é divergente!");
        }

        const despesas_nao_lancadas = Number(caixa.despesas_nao_lancadas);
        //~~ Validação de despesas não lançadas
        if (despesas_nao_lancadas > 0) {
          throw new Error(
            `Não é possível confirmar o caixa pois há ${despesas_nao_lancadas} ${
              despesas_nao_lancadas === 1 ? "despesa não lançada" : "despesas não lançadas"
            }!`
          );
        }

        await conn.execute(
          `
          UPDATE datasys_caixas SET status = 'CONFIRMADO' WHERE id = ?
        `,
          [id]
        );
        await conn.execute(
          `
          INSERT INTO datasys_caixas_historico (
            id_caixa,
            descricao
          ) VALUES (?,?)
        `,
          [id, `Caixa CONFIRMADO por ${user.nome.toUpperCase()}`]
        );
        // console.log("Atualizando saldo...");
        await updateSaldo({
          conn,
          id_caixa: id,
        });
      }
      //* FIM - CONFIRMAÇÃO DE CAIXA

      //* INÍCIO - DESCONFIRMAÇÃO DE CAIXA
      if (action === "desconfirmar") {
        await conn.execute(
          `
          UPDATE datasys_caixas SET status = 'A CONFERIR' WHERE id = ?
          `,
          [id]
        );
        await conn.execute(
          `
          INSERT INTO datasys_caixas_historico (
            id_caixa,
            descricao
            ) VALUES (?,?)
            `,
          [id, `Caixa DESCONFIRMADO por ${user.nome.toUpperCase()}`]
        );
      }
      //* FIM - DESCONFIRMAÇÃO DE CAIXA

      await conn.commit();
      // await conn.rollback();
      resolve({ message: "Sucesso" });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERÊNCIA_DE_CAIXA",
        method: "CHANGE_STATUS_CAIXA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
      if (conn) await conn.rollback();
    } finally {
      if (conn) conn.release();
    }
  });
};
