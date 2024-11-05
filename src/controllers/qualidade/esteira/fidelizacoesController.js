const { formatDate } = require("date-fns");
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");

// FIDELIZAÇÕES
exports.getGSMFidelizacoesAparelho = async (req, res) => {
  let conn;
  try {
    const { data_inicial, data_final, grupo_economico, incluir_fidelizados } = req.query;

    conn = await db.getConnection();

    if (!data_inicial || !data_final) {
      throw new Error("Preencha a data inicial e final")
    }
    if (!grupo_economico) {
      throw new Error('Grupo econômico não informado!')
    }
    const facell_docs = grupo_economico == 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
    const params = []
    let where = ` WHERE 1=1
    AND fidAparelho = 'Sim' 
    AND modalidade NOT LIKE '%PRÉ%' 
    AND imei IS NOT NULL 
    AND dtAtivacao BETWEEN ? AND ? `
    params.push(formatDate(data_inicial, 'yyyy-MM-dd'))
    params.push(formatDate(data_final, 'yyyy-MM-dd'))

    if (!(incluir_fidelizados == 1 || incluir_fidelizados == 'true')) {
      where += ` AND status_fid_aparelho != 'Fidelizado' `
    }

    const [rows] = await conn.execute(`SELECT DISTINCT gsm FROM ${facell_docs} ${where}`, params)
    const gsms = rows && rows.map(row => row['gsm']) || []
    res.status(200).json({ qtde: gsms.length, gsms })
  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'GET_FIDELIZACOES_APARELHO',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}

exports.listarFidelizacoes = ({
  anoMes,
  filial = null,
  grupo_economico
}) => {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
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