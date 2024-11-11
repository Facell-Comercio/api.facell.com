const { db } = require("../../../../mysql");
const { Readable } = require("stream");
const csv = require("csv-parser");
const XLSX = require("xlsx");

async function listarDadosSelectsContestacaoAnomalia() {
  return new Promise(async (resolve, reject) => {
    try {
      const [dados] = await db.execute(`
            SELECT 'motivos_envio' AS tipo, id, motivo_envio as descricao FROM tim_contest_anomalia_motivos_envio
            UNION ALL
            SELECT 'motivos_contest' AS tipo, id, motivo_contestacao as descricao FROM tim_contest_anomalia_motivos_contest
            `);
      resolve(dados);
      return true;
    } catch (error) {
      console.log(error);
      reject(error);
      return false;
    }
  });
}

async function novaContestacaoAnomalia(body) {
  return new Promise(async (resolve, reject) => {
    try {
      var {
        gsm,
        contrato,
        matricula_tim,
        motivo_envio,
        motivo_contestacao,
        thales_status,
        detalhamento,
        data_ativacao,
        data_importacao,
        filial,
        solicitante,
        grupo_economico
      } = body;

      if(!grupo_economico){
        reject('Grupo não informado!')
        return false;
      }
      const tim_contest_anomalia = grupo_economico === 'FACELL' ? 'tim_contest_anomalia' : 'tim_contest_anomalia_fort';

      const [result] = await db.execute(
        `INSERT INTO ${tim_contest_anomalia} 
            (data_criacao, gsm, contrato, login, id_motivo_envio, id_motivo_contestacao, thales_status, detalhamento, dtAtivacao, data_importacao, filial, solicitante, grupo_economico) 
            VALUES (now(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          gsm,
          contrato,
          matricula_tim,
          motivo_envio,
          motivo_contestacao,
          thales_status,
          detalhamento,
          data_ativacao,
          data_importacao,
          filial,
          solicitante,
          grupo_economico
        ]
      );
      resolve(result.affectedRows);
      return true;
    } catch (error) {
      console.log(error);
      reject(error);
      return false;
    }
  });
}

async function listarContestacoesAnomalias({ anoMes, filial, grupo_economico }) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('Grupo não informado!')
      return false;
    }
    const tim_contest_anomalia = grupo_economico === 'FACELL' ? 'tim_contest_anomalia' : 'tim_contest_anomalia_fort';

    try {
      var rows = [];
      if (filial) {
        [rows] = await db.execute(
          `SELECT ca.*, me.motivo_envio, mc.motivo_contestacao FROM ${tim_contest_anomalia} AS ca 
                INNER JOIN tim_contest_anomalia_motivos_contest AS mc ON ca.id_motivo_contestacao = mc.id
                INNER JOIN tim_contest_anomalia_motivos_envio AS me ON ca.id_motivo_envio = me.id
                WHERE grupo_economico = '${grupo_economico}' and DATE_FORMAT(data_criacao, '%Y-%m') = ? and filial = ?;`,
          [anoMes, filial]
        );
      } else {
        [rows] = await db.execute(
          `SELECT ca.*, me.motivo_envio, mc.motivo_contestacao FROM ${tim_contest_anomalia} AS ca 
                INNER JOIN tim_contest_anomalia_motivos_contest AS mc ON ca.id_motivo_contestacao = mc.id
                INNER JOIN tim_contest_anomalia_motivos_envio AS me ON ca.id_motivo_envio = me.id
                WHERE grupo_economico = '${grupo_economico}' and DATE_FORMAT(data_criacao, '%Y-%m') = ?;`,
          [anoMes]
        );
      }

      resolve(rows);
      return true;
    } catch (error) {
      console.log(error);
      reject(error);
      return false;
    }
  });
}

async function listarContestacoesAnomaliasNovas({anoMes, grupo_economico}) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('Grupo não informado!')
      return false;
    }
    const tim_contest_anomalia = grupo_economico === 'FACELL' ? 'tim_contest_anomalia' : 'tim_contest_anomalia_fort';

    try {
      const [rows] = await db.execute(
        `SELECT ca.gsm, ca.contrato, ca.login, data_importacao, me.motivo_envio, mc.motivo_contestacao, ca.detalhamento, ca.dtAtivacao, ca.thales_status, ca.id, ca.protocolo FROM ${tim_contest_anomalia} AS ca 
            INNER JOIN tim_contest_anomalia_motivos_contest AS mc ON ca.id_motivo_contestacao = mc.id
            INNER JOIN tim_contest_anomalia_motivos_envio AS me ON ca.id_motivo_envio = me.id
            WHERE grupo_economico = '${grupo_economico}' and status = 'Envio Pendente' and DATE_FORMAT(data_criacao, '%Y-%m') = ?;`,
        [anoMes]
      );
      resolve(rows);
      return true;
    } catch (error) {
      console.log(error);
      reject(error);
      return false;
    }
  });
}

async function confirmarContestacoesAnomalias(buffer, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('[CONFIRM_CONTEST_ANOM]: Grupo não informado!')
      return false;
    }
    const tim_contest_anomalia = grupo_economico === 'FACELL' ? 'tim_contest_anomalia' : 'tim_contest_anomalia_fort';
    
    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // Escolher a planilha desejada (por nome ou índice)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converter a planilha em um objeto JSON
      var jsonData = XLSX.utils.sheet_to_json(worksheet);
    } catch (error) {
      console.log(error)
      reject(error);
      return false;
    }
    try {
      var conn = await db.getConnection();
      await conn.beginTransaction();
      await conn.execute("START TRANSACTION");

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        const id = row["id"] || null;
        const protocolo = row["protocolo"]?.trim() || null;
        if(!id || !protocolo){
          continue;
        }

        await conn.execute(
          `UPDATE ${tim_contest_anomalia} SET status = 'Em analise', protocolo = ? WHERE id = ? ;`,
          [protocolo, id]
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
    resolve();
    return true;
  });
}
function removeNonPrintableChars(obj) {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const sanitizedKey = key.replace(/[^\x20-\x7E]/g, ""); // Remove caracteres não imprimíveis
      if (key !== sanitizedKey) {
        obj[sanitizedKey] = obj[key];
        delete obj[key];
      }
    }
  }
}

function parseDataHoraBRparaDatetime(data) {
  if (!data) return null;
  partesData = data.split(/[\/\s]+/);
  dataFormatada = `${partesData[2]}-${partesData[1]}-${partesData[0]} ${3}:00`;
  return dataFormatada;
}
function parseDataHoraBRparaDate(data) {
  if (!data) return null;
  partesData = data.split(/[\/\s]+/);
  dataFormatada = `${partesData[2]}-${partesData[1]}-${partesData[0]}`;
  return dataFormatada;
}


async function importarRespostaTimContestacoesAnomalias(buffer, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    if(!grupo_economico){
      reject('[IMPORT_RESP_TIM_CONTEST_ANOM]: Grupo não informado!')
      return false;
    }
    const tim_contest_anomalia = grupo_economico === 'FACELL' ? 'tim_contest_anomalia' : 'tim_contest_anomalia_fort';
    
    const readableStream = Readable.from(buffer, { encoding: "utf-8" });
    const results = [];
    readableStream
      .pipe(csv({ separator: ";" }))
      .on("data", (row) => {
        removeNonPrintableChars(row);
        results.push(row);
      })
      .on("end", async () => {
        try {
          var conn = await db.getConnection();
          await conn.beginTransaction();
          await conn.execute("START TRANSACTION");

          for (let i = 0; i < results.length; i++) {
            const row = results[i];

            var cod_protocolo_contestacao = row['"cod_protocolo_contestacao"'];
            cod_protocolo_contestacao = cod_protocolo_contestacao || row.cod_protocolo_contestacao;

            const tipo = row["tipo"];
            const protocolo = tipo + cod_protocolo_contestacao;

            const dt_criacao = parseDataHoraBRparaDate(row["dt_criacao"]);
            const num_telefone = row["num_telefone"]?.substring(0,20) || '';
            const usuario_resposta = row["usuario_resposta"]?.substring(0,150) || '';
            const dt_resposta = parseDataHoraBRparaDatetime(row["dt_resposta"]);
            const dsc_status_motivo_contestacao =
              row["dsc_status_motivo_contestacao"]?.substring(0,150) || '';

            await conn.execute(
              `UPDATE ${tim_contest_anomalia} SET status = ?, usuario_resposta = ?, data_resposta = ?
                        WHERE protocolo = ? ;`,
              [
                dsc_status_motivo_contestacao,
                usuario_resposta,
                dt_resposta,
                protocolo,
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

module.exports = {
  novaContestacaoAnomalia,
  listarDadosSelectsContestacaoAnomalia,
  listarContestacoesAnomalias,
  listarContestacoesAnomaliasNovas,
  confirmarContestacoesAnomalias,
  importarRespostaTimContestacoesAnomalias,
};
