const { db } = require("../../../../mysql");

// DUPLICIDADES
async function listarDuplicidadesDatasys(
  anoMes,
  filial = null,
  grupo_economico
) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject("[LISTAR DUPLICIDADES]: Grupo não informado!");
      return false;
    }
    const datasys_ativacoes = grupo_economico === "FACELL" ? "datasys_ativacoes" : "datasys_ativacoes_fort";

    try {
      var duplicidades = [];

      if (filial) {
        [duplicidades] = await db.execute(
          `SELECT 
              filial,
              vendedor,
              gsm, 
              gsmProvisorio,
              modalidade,
              plaOpera,
              categoria,
              COUNT(gsm) AS qtde
            FROM 
              ${datasys_ativacoes} 
            WHERE 
                (
                  modalidade LIKE '%PORT%' OR
                  modalidade LIKE '%ATIV%' OR
                  modalidade LIKE '%MIGR%' OR
                  modalidade LIKE '%UPGR%'
                ) AND
                NOT statusLinha LIKE '%DUPLICIDADE%' AND
                NOT statusLinha LIKE '%VENDA IRREGULAR%' AND
                NOT statusLinha LIKE '%CANCELADA%' AND
                NOT modalidade LIKE '%LIVE%' AND 
                NOT modalidade LIKE '%PRÉ-PAGO%' AND 
                DATE_FORMAT(dtAtivacao, '%Y-%m') = ? AND
                filial = ?
            GROUP BY 
                gsm
            HAVING 
                qtde > 1
            ORDER BY
              qtde desc, gsm;`,
          [anoMes, filial]
        );
      } else {
        [duplicidades] = await db.execute(
          `SELECT 
            filial,
            vendedor,
            gsm, 
            gsmProvisorio,
            modalidade,
            plaOpera,
            categoria,
            COUNT(gsm) AS qtde
        FROM 
          ${datasys_ativacoes}
        WHERE 
            (
                modalidade LIKE '%PORT%' OR
                modalidade LIKE '%ATIV%' OR
                modalidade LIKE '%MIGR%' OR
                modalidade LIKE '%UPGR%'
            ) AND
            NOT statusLinha LIKE '%DUPLICIDADE%' AND
            NOT statusLinha LIKE '%VENDA IRREGULAR%' AND
            NOT statusLinha LIKE '%CANCELADA%' AND
            NOT modalidade LIKE '%LIVE%' AND 
            NOT modalidade LIKE '%PRÉ-PAGO%' AND 
            DATE_FORMAT(dtAtivacao, '%Y-%m') = ?
        GROUP BY 
            gsm
        HAVING 
            qtde > 1
        ORDER BY
          qtde desc, gsm;`,
          [anoMes]
        );
      }

      resolve(duplicidades);
      return true;
    } catch (error) {
      console.log('[LISTAR_DUPLICIDADES]', error)
      reject(error);
      return false;
    }
  });
}

module.exports = {
  listarDuplicidadesDatasys,
};
