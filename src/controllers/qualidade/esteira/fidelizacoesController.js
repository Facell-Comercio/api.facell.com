const { db } = require("../../../../mysql");

// FIDELIZAÇÕES
async function listarFidelizacoes(
  anoMes,
  filial = null,
  grupo_economico
) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('[LISTAR FIDELIZAÇÕES]: Grupo não informado!')
      return false;
    }
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

    try {
      var fidelizacoes = [];
      if (filial) {
        [fidelizacoes] = await db.execute(
          `SELECT id, fidAparelho, fidPlano, data_fid_aparelho, status_fid_aparelho, status_fid_plano,  gsm, gsmProvisorio, status_ativacao, modalidade, plaOpera, plano_ativado, dtAtivacao, cpf_cliente, cliente, vendedor, filial, imei, aparelho, pedido , statusLinha, obs_fid, obs_fid_adm 
          FROM ${facell_docs} 
          WHERE 
            grupo_economico = '${grupo_economico}' 
            and fidAparelho = 'Sim' 
            and modalidade NOT LIKE '%PRÉ%' 
            and  imei IS NOT NULL 
            and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? 
            and filial = ?`,
          [anoMes, filial]
        );
      } else {
        [fidelizacoes] = await db.execute(
          `SELECT id, fidAparelho, fidPlano, data_fid_aparelho, status_fid_aparelho, status_fid_plano,  gsm, gsmProvisorio, status_ativacao, modalidade, plaOpera, plano_ativado, dtAtivacao, cpf_cliente, cliente, vendedor, filial, imei, aparelho, pedido , statusLinha, obs_fid, obs_fid_adm 
          FROM ${facell_docs} 
          WHERE 
            grupo_economico = '${grupo_economico}' 
            and fidAparelho = 'Sim' 
            and modalidade NOT LIKE '%PRÉ%' 
            and  imei IS NOT NULL 
            and DATE_FORMAT(dtAtivacao, '%Y-%m') = ?`,
          [anoMes]
        );
      }

      resolve(fidelizacoes);
      return true;
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

module.exports = {
    listarFidelizacoes,
  };