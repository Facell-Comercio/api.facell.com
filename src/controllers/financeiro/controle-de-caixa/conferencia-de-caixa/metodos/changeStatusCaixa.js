const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const getCaixaAnterior = require("./getCaixaAnterior");

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
          dc.status,
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
      if (action === "confirmar") {
        if (Number(caixa.ocorrencias_nao_resolvidas) > 0) {
          throw new Error(
            `Há ${caixa.ocorrencias_nao_resolvidas} ocorrências não resolvidas!`
          );
        }
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
      }
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
      await conn.commit();
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
