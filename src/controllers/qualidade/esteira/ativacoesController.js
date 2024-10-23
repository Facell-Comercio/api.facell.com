const { db } = require("../../../../mysql");
const csv = require("csv-parser");
const iconv = require("iconv-lite");


// ATIVAÇÕES
async function listarAtivacoes({
  anoMes,
  filial,
  grupo_economico
}) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject('[LISTAR_ATIVACOES]: Grupo não informado!')
      return false;
    }
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

    try {
      var ativacoes = [];
      if (filial) {
        [ativacoes] = await db.execute(
          `SELECT id, gsm, gsmProvisorio, status_ativacao, modalidade, plaOpera, plano_ativado, dtAtivacao, cpf_cliente, cliente, vendedor, filial, imei, aparelho, fidAparelho, fidPlano, status_fid_aparelho, status_fid_plano, pedido, statusLinha, obs_ativ, obs_ativ_adm  
            FROM ${facell_docs} 
            WHERE 
            grupo_economico = '${grupo_economico}' 
            -- and modalidade NOT LIKE '%PRÉ%' 
            and modalidade NOT LIKE '%PRÉ-PAGO%' 
            and  modalidade NOT LIKE '%TROCA DE%' 
            and  modalidade NOT LIKE '%Alteração Cadastral%' 
            and modalidade NOT LIKE 'Criação de Protocolo'
            and modalidade NOT LIKE 'UPGRADE PÓS-PÓS'
            and modalidade NOT LIKE 'ATIVAÇÃO LIVE TIM'
            and  modalidade NOT LIKE '%Segunda via de Conta%' 
            and  modalidade NOT LIKE '%DEBITO%'
            and  modalidade NOT LIKE '%Reagendamento%'
            and modalidade NOT LIKE 'Transferencia de Titularidade' 
            and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? 
            and filial = ?`,
          [anoMes, filial]
        );
      } else {
        [ativacoes] = await db.execute(
          `SELECT id, gsm, gsmProvisorio, status_ativacao, modalidade, plaOpera, plano_ativado, dtAtivacao, cpf_cliente, cliente, vendedor, filial, imei, aparelho, fidAparelho, fidPlano, status_fid_aparelho, status_fid_plano, pedido, statusLinha, obs_ativ, obs_ativ_adm  
            FROM ${facell_docs} 
            WHERE grupo_economico = '${grupo_economico}' 
            -- and modalidade NOT LIKE '%PRÉ%' 
            and modalidade NOT LIKE '%PRÉ-PAGO%' 
            and  modalidade NOT LIKE '%TROCA DE%' 
            and  modalidade NOT LIKE '%Alteração Cadastral%' 
            and modalidade NOT LIKE 'Criação de Protocolo'
            and modalidade NOT LIKE 'UPGRADE PÓS-PÓS'
            and modalidade NOT LIKE 'ATIVAÇÃO LIVE TIM'
            and  modalidade NOT LIKE '%Segunda via de Conta%' 
            and  modalidade NOT LIKE '%DEBITO%'
            and  modalidade NOT LIKE '%Reagendamento%' 
            and modalidade NOT LIKE 'Transferencia de Titularidade'
            and DATE_FORMAT(dtAtivacao, '%Y-%m') = ?`,
          [anoMes]
        );
      }

      resolve(ativacoes);
      return true;
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

async function importarCBCF(anoMes, buffer, grupo_economico, relatorio) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject('[IMPORTAR_CBCF]: Grupo não informado!')
      return false;
    }
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

    // Converta o buffer de Windows-1252 para UTF-8 usando iconv-lite.
    const utf8String = iconv.decode(buffer, "win1252");

    const readableStream = require("stream").Readable.from(utf8String);
    const results = [];
    readableStream
      .pipe(csv({ separator: "," }))
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", async () => {
        try {
          var conn = await db.getConnection();
          await conn.beginTransaction();
          await conn.execute("START TRANSACTION");

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            // console.log(row)

            const gsm = row["gsm"];
            const status = row["status"]?.substring(0, 50);
            const plano_ativado = row["planoTarifario"]?.substring(0, 50);
            const codCliente = row["codCliente"];

            var dataFidAparelho = null;
            var dataFidPlano = null;
            // Passagem pelas fidelizações
            for (let f = 1; f < 3; f++) {
              const motivo = row[`fid${f}_motivo`] || null;
              var data_criacao = row[`fid${f}_criacao`] || null;
              if (data_criacao && data_criacao !== "") {
                data_criacao = data_criacao.split("/").reverse().join("-");
              }

              if (!motivo || motivo == "") {
                continue;
              }
              if (motivo.toLowerCase().includes("aparelho")) {
                dataFidAparelho = data_criacao;
              } else {
                dataFidPlano = data_criacao;
              }
            }
            var verificaAlteracaoManual = "";
            if (relatorio) {
              verificaAlteracaoManual = ` and ${relatorio}_alterado_manual = false `;
            }

            // Inicio da análise de fid de aparelho
            const [rowsAparelho] = await conn.execute(`SELECT d.id, plaOpera, DATE_FORMAT(dtAtivacao, '%Y-%m-%d') AS dtAtivacao, p.deve_ter, p.nao_deve_ter 
              FROM ${facell_docs} d
              LEFT JOIN datasys_planos_fid_aparelho p ON p.plano_datasys = d.plaOpera
              WHERE fidAparelho = 'SIM' and NOT imei IS NULL ${verificaAlteracaoManual} and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? and (gsm = ? OR gsmProvisorio = ?) LIMIT 1`, [anoMes, gsm, gsm])
            const docAparelho = rowsAparelho && rowsAparelho[0]
            var status_fid_aparelho = 'Não fidelizado'


            if (dataFidAparelho && docAparelho) {
              const dateFid = new Date(dataFidAparelho + ' 00:00:00')
              const dateAtiv = new Date(docAparelho['dtAtivacao']?.toString().split('T')[0] + ' 00:00:00')
              const dif = dateFid - dateAtiv;
              const difDias = dif / (1000 * 60 * 60 * 24)

              if (difDias < 0) {
                status_fid_aparelho = 'Fid < 0'
              }
              if (difDias > 4) {
                status_fid_aparelho = 'Fid > 4'
              }
              if (difDias >= 0 && difDias <= 4) {
                status_fid_aparelho = 'Fidelizado'
              }
              const plano_tim = plano_ativado?.toLowerCase()
              const planoIdentificado = plano_tim.includes(docAparelho['deve_ter'])
              var termoIndevido = false;

              if (docAparelho['nao_deve_ter']) {
                const lista_nao_deve_ter = docAparelho['nao_deve_ter'].split(',')
                lista_nao_deve_ter.forEach(termo => {
                  if (plano_tim.includes(termo)) {
                    termoIndevido = true
                  }
                })
              }
              if (!planoIdentificado || (planoIdentificado && termoIndevido)) {
                status_fid_aparelho = 'Plano divergente'
              }
            }
            // fim da análise da fid aparelho

            await conn.execute(
              `UPDATE ${facell_docs} 
                  SET 
                      status_ativacao = ?, 
                      plano_ativado = ?, 
                      cod_cliente = ?, 
                      data_fid_plano = ?, 
                      data_fid_aparelho = ?,
                      status_fid_aparelho = ?
                  WHERE 
                  DATE_FORMAT(dtAtivacao, '%Y-%m') = ? and (gsm = ? OR gsmProvisorio = ?)  ${verificaAlteracaoManual};`,
              [
                status,
                plano_ativado,
                codCliente,
                dataFidPlano,
                dataFidAparelho,
                status_fid_aparelho,
                anoMes,
                gsm,
                gsm
              ]
            );
          }
          await conn.execute("COMMIT");
        } catch (error) {
          console.log(error);
          await conn.execute("ROLLBACK");
          reject(error);
        } finally {
          if (conn) conn.release();
        }

        resolve("Sucesso!");
        return true;
      })
      .on("error", (e) => {
        console.log(e);
        reject(e);

        return false;
      });
  });
}

async function importarExpress(anoMes, buffer, grupo_economico, relatorio) {
  return new Promise(async (resolve, reject) => {
    if (!grupo_economico) {
      reject('[IMPORTAR_EXPRESS]: Grupo não informado!')
      return false;
    }

    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
    // Converta o buffer de Windows-1252 para UTF-8 usando iconv-lite.
    const utf8String = iconv.decode(buffer, "win1252");

    const readableStream = require("stream").Readable.from(utf8String);
    const results = [];
    readableStream
      .pipe(csv({ separator: "," }))
      .on("data", (row) => {
        results.push(row);
      })
      .on("end", async () => {
        try {
          var conn = await db.getConnection();
          await conn.beginTransaction();
          await conn.execute("START TRANSACTION");

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            // console.log(row)

            const gsm = row["gsm"];
            const status = row["status"]?.substring(0, 50);
            const plano_ativado = row["plano"]?.substring(0, 80);

            var verificaAlteracaoManual = "";
            if (relatorio) {
              verificaAlteracaoManual = ` and ${relatorio}_alterado_manual = false `;
            }
            await conn.execute(
              `UPDATE ${facell_docs} 
                          SET status_ativacao = ?, plano_ativado = ? 
                          WHERE DATE_FORMAT(dtAtivacao, '%Y-%m') = ? and (gsm = ? OR gsmProvisorio = ?) ${verificaAlteracaoManual};`,
              [status, plano_ativado, anoMes, gsm, gsm]
            );
          }
          await conn.execute("COMMIT");
        } catch (error) {
          console.log(error);
          await conn.execute("ROLLBACK");
          reject(error);
        } finally {
          if (conn) conn.release();
        }

        resolve("Sucesso!");
        return true;
      })
      .on("error", (e) => {
        console.log(e);
        reject(e);

        return false;
      });
  });
}

module.exports = {
  listarAtivacoes,
  importarCBCF,
  importarExpress,
};