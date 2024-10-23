const { db } = require("../../../../mysql");
const csv = require("csv-parser");

// INADIMPLÊNCIA
function transformarNumeroBRparaFloat(texto) {
    if (!texto) return null;
    texto = texto.replace(".", "").replace(",", ".");
  
    // Use uma expressão regular para encontrar números e pontos
    const regex = /[\d.]+/g;
  
    // Use o método match para encontrar todas as correspondências
    const correspondencias = texto.match(regex);
  
    // Junte as correspondências encontradas em uma única string
    const numerosEPontos = correspondencias ? correspondencias.join("") : null;
  
    return numerosEPontos;
  }
  function tratarDataSGR(data) {
    if (!data || data == "") return null;
    const dataTratada = data.substring(0, 10).split("/").reverse().join("-");
    return dataTratada;
  }
  async function importarSGR(anoMes, buffer, grupo_economico) {
    return new Promise(async (resolve, reject) => {
      if(!grupo_economico){
        reject('[IMPORTAR_SGR]: Grupo não informado!')
        return false;
      }
      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

      const readableStream = require("stream").Readable.from(buffer, {
        encoding: "utf-8",
        start: 1,
      });
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
              // console.log('Passando pela linha '+i)
              const row = results[i];
              // console.log(row)
  
              const status_inadimplencia = row["status"]?.substring(0, 50);
              const cod_cliente = row["cod_cliente"];
              const sgr_fat1_vencimento = tratarDataSGR(row["fat1_datavenc"]);
              const sgr_fat1_valor = transformarNumeroBRparaFloat(
                row["fat1_valor"]
              );
              const sgr_fat2_vencimento = tratarDataSGR(row["fat2_datavenc"]);
              const sgr_fat2_valor = transformarNumeroBRparaFloat(
                row["fat2_valor"]
              );
  
              await conn.execute(
                `UPDATE ${facell_docs}
                  SET status_inadimplencia = ?, sgr_fat1_vencimento = ?, sgr_fat1_valor = ?, sgr_fat2_vencimento = ?, sgr_fat2_valor = ?
                  WHERE DATE_FORMAT(dtAtivacao, '%Y-%m') = ? and cod_cliente = ? and inadim_alterado_manual = false;`,
                [
                  status_inadimplencia,
                  sgr_fat1_vencimento,
                  sgr_fat1_valor,
                  sgr_fat2_vencimento,
                  sgr_fat2_valor,
                  anoMes,
                  cod_cliente,
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
  
  async function listarInadimplencias(
    anoMes,
    filial = null,
    grupo_economico
  ) {
    return new Promise(async (resolve, reject) => {
      if(!grupo_economico){
        reject('[LISTAR INADIM]: Grupo não informado!')
        return false;
      }
      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

      try {
        var inadimplencias = [];
        var query = `SELECT id, status_inadimplencia, sgr_fat1_vencimento, sgr_fat2_vencimento, sgr_fat1_valor, sgr_fat2_valor, cod_cliente, gsm, gsmProvisorio, modalidade, plaOpera, dtAtivacao, cpf_cliente, cliente, vendedor, filial, obs_inadim, obs_inadim_adm 
              FROM ${facell_docs}
              WHERE 
              grupo_economico = '${grupo_economico}' and 
              cod_cliente IS NOT NULL and 
              modalidade NOT LIKE '%PRÉ%' and 
              modalidade NOT LIKE '%TROCA DE%' and 
              modalidade NOT LIKE '%UPGRADE%' and 
              modalidade NOT LIKE '%ATIVAÇÃO LIVE TIM%' and 
              modalidade NOT LIKE '%C6 BANK%' and 
              plaOpera NOT LIKE '%DEPENDENTE%' and 
              plaOpera NOT LIKE '%EXPRESS%' and 
              DATE_FORMAT(dtAtivacao, '%Y-%m') = ?`;
  
        if (filial) {
          query += ` and filial = ?`;
          [inadimplencias] = await db.execute(query, [anoMes, filial]);
        } else {
          [inadimplencias] = await db.execute(query, [anoMes]);
        }
  
        resolve(inadimplencias);
        return true;
      } catch (error) {
        reject(error);
        return false;
      }
    });
  }

  module.exports = {
    importarSGR,
    listarInadimplencias,
  };