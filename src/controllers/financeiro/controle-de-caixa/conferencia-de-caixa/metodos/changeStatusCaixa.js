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
    //enum('A CONFERIR','CONFERIDO / BAIXA PENDENTE','BAIXADO / PENDENTE DATASYS','BAIXADO NO DATASYS')
    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      const [rowsCaixas] = await conn.execute(
        `
        SELECT 
          dc.status, dc.data, dc.id_filial,
          dc.valor_dinheiro, dc.valor_retiradas,
          COALESCE(SUM(dco.resolvida = 0),0) as ocorrencias_nao_resolvidas
        FROM datasys_caixas dc
        LEFT JOIN filiais f ON f.id = dc.id_filial
        LEFT JOIN datasys_caixas_ocorrencias dco ON dco.id_filial = dc.id_filial AND dco.data_caixa = dc.data
        WHERE dc.id = ?
        `,
        [id]
      );
      const caixa = rowsCaixas && rowsCaixas[0];

      if (caixa.status === "BAIXADO NO DATASYS") {
        throw new Error(`Nenhuma ação pode ser realizada nesse caixa`);
      }

      //* INÍCIO - CONFIRMAÇÃO DE CAIXA
      if (action === "conferir") {
        await conn.execute(
          `
          UPDATE datasys_caixas SET status = 'CONFERIDO / BAIXA PENDENTE' WHERE id = ?
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
      //* FIM - CONFIRMAÇÃO DE CAIXA

      //* INÍCIO - CONFERÊNCIA DE CAIXA
      if (action === "confirmar") {
        if (Number(caixa.ocorrencias_nao_resolvidas) > 0) {
          throw new Error(
            `Há ${caixa.ocorrencias_nao_resolvidas} ocorrências não resolvidas!`
          );
        }

        //~ INÍCIO - Validação de regra de negócio para a baixa de caixa
        const [rowCaixaAnterior] = await conn.execute(
          `SELECT status FROM datasys_caixas 
          WHERE data < ? 
          ORDER BY data DESC
          LIMIT 1`,
          [startOfDay(caixa.data)]
        );

        const caixaAnterior = rowCaixaAnterior && rowCaixaAnterior[0];

        if (
          caixaAnterior && !(
            caixaAnterior['status'] === "BAIXADO NO DATASYS" ||
            caixaAnterior['status'] === "BAIXADO / PENDENTE DATASYS"
          )
        ) {
          throw new Error(
            "Ainda não foi realizada a confirmação no caixa anterior"
          );
        }
        //~ FIM - Validação de regra de negócio para a baixa de caixa

        await conn.execute(
          `
          UPDATE datasys_caixas SET status = 'BAIXADO / PENDENTE DATASYS' WHERE id = ?
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
        console.log("Atualizando saldo...");
        await updateSaldo({
          conn,
          id_caixa: id,
        });
      }
      //* FIM - CONFIRMAÇÃO DE CAIXA

      //* INÍCIO - DESCONFIRMAÇÃO DE CAIXA
      if (action === "desconfirmar") {
        //~ INÍCIO - Validação de regra de negócio para a desconfirmação de caixa
        const [rowCaixaSeguinte] = await conn.execute(
          `SELECT status, data FROM datasys_caixas 
          WHERE data > ? 
          ORDER BY data ASC
          LIMIT 1`,
          [startOfDay(caixa.data)]
        );
        const statusCaixaSeguinte =
          rowCaixaSeguinte && rowCaixaSeguinte[0] && rowCaixaSeguinte[0].status;
        if (
          statusCaixaSeguinte === "BAIXADO NO DATASYS" ||
          statusCaixaSeguinte === "BAIXADO / PENDENTE DATASYS"
        ) {
          throw new Error(
            "Ação não permitida pois já foi realizada a confirmação do caixa seguinte"
          );
        }
        //~ FIM - Validação de regra de negócio para a desconfirmação de caixa

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
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      if (conn) await conn.rollback();
    } finally {
      if (conn) conn.release();
    }
  });
};
