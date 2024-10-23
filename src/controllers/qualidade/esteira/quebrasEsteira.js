const { db } = require("../../../../mysql");

async function listarQuebrasEsteira({ anoMes, filial, grupo_economico }) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject("[LISTAR_QUEBRAS_ESTEIRA]: Grupo não informado!");
      return false;
    }
    const facell_docs =
      grupo_economico === "FACELL" ? "facell_docs" : "facell_docs_fort";

    try {
      var quebrasEsteira = [];
      if (filial) {
        [quebrasEsteira] = await db.execute(
          `SELECT 
              id,
              dtAtivacao,
              status_quebra_esteira,
              vendedor,
              filial,
              pedido,
              modalidade,
              gsm,
              cpf_cliente,
              chamado_in,
              obs_gestor_quebra_esteira,
              obs_adm_quebra_esteira,
              thales_status,
              thales_operacao
              
             
            FROM ${facell_docs} 
            WHERE 
            (thales_status_aparelho = 'Não enviado' OR thales_status_servico = 'Não enviado' OR thales_operacao LIKE 'PF N/A%' OR thales_operacao LIKE 'PJ %N/A%')
            and statusLinha <> 'CANCELADA' and statusLinha <> 'DUPLICIDADE' and thales_status <> 'Liberado sem envio' and NOT plaOpera LIKE '%FIXO%' and NOT plaOpera LIKE '%LIVE%' and NOT plaOpera LIKE '%FIBRA%' 
            and grupo_economico = '${grupo_economico}' 
            and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? 
            and filial = ?
            `,
          [anoMes, filial]
        );
      } else {
        [quebrasEsteira] = await db.execute(
          `SELECT id,
            dtAtivacao,
            status_quebra_esteira,
            vendedor,
            filial,
            pedido,
            modalidade,
            gsm,
            cpf_cliente,
            chamado_in,
            obs_gestor_quebra_esteira,
            obs_adm_quebra_esteira,
            thales_status,
            thales_operacao
           
          FROM ${facell_docs} 
          WHERE 
          (thales_status_aparelho = 'Não enviado' OR thales_status_servico = 'Não enviado' OR thales_operacao LIKE 'PF N/A%' OR thales_operacao LIKE 'PJ %N/A%')
          and statusLinha <> 'CANCELADA' and statusLinha <> 'DUPLICIDADE' and thales_status <> 'Liberado sem envio' and NOT plaOpera LIKE '%FIXO%' and NOT plaOpera LIKE '%LIVE%' and NOT plaOpera LIKE '%FIBRA%' 
          and grupo_economico = '${grupo_economico}' 
          and DATE_FORMAT(dtAtivacao, '%Y-%m') = ?`,
          [anoMes]
        );
      }

      resolve(quebrasEsteira);
      return true;
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

module.exports = {
  listarQuebrasEsteira,
};
