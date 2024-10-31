const { db } = require("../../../../mysql");

function salvarObsDocs({ id, obs, obs_col, grupo_economico }) {
  return new Promise(async (resolve, reject) => {
    if ((!obs_col, !id)) {
      reject("[SALVAR OBS DOCS]: ID e/ou coluna não informados!");
      return false;
    }
    if(!grupo_economico){
      reject('[SALVAR OBS DOCS]: Grupo econômico não informado!');
      return false;
    }
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
    try {
      await db.execute(`UPDATE ${facell_docs} SET ${obs_col} = ? WHERE id = ?`, [
        obs,
        id,
      ]);

      resolve();
      return true;
    } catch (error) {
      console.error('[SALVAR OBS DOCS]:', error)
      reject(error);
      return false;
    }
  });
}

function updateStatusDocs({ id, col, status, grupo_economico }) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('[ATUALIZAR STATUS DOCS]: Grupo econômico não informado!');
      return false;
    }
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

    if (!col || !status || !id) {
      reject("ID e/ou coluna não informados!");
      return false;
    }
    try {
      var col_alterado_manual = null;
      switch (col) {
        case "status_ativacao":
          col_alterado_manual = "ativ_alterado_manual";
          break;
        case "status_fid_aparelho":
          col_alterado_manual = "fid_alterado_manual";

          break;
        case "status_inadimplencia":
          col_alterado_manual = "inadim_alterado_manual";

          break;
        default:
          break;
      }

      var setAlteradoManual = "";
      if (col_alterado_manual) {
        setAlteradoManual = `, ${col_alterado_manual} = ${status !== 'Analise Pendente' ? 'true' : 'false'} `;
      }
      await db.execute(
        `UPDATE ${facell_docs} SET ${col} = ? ${setAlteradoManual} WHERE id = ?`,
        [status, id]
      );

      resolve();
      return true;
    } catch (error) {
      console.error(error)
      reject(error);
      return false;
    }
  });
}

module.exports = {
  salvarObsDocs,
  updateStatusDocs,
};
