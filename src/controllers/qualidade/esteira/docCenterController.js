const { db } = require("../../../../mysql");
const csv = require("csv-parser");
const fs = require("fs");
const path = require("path");
const XLSX = require("xlsx");

// Importação do DocCenter
async function old_importarDocCenter(anoMes, csvFileBuffer, grupo_economico) {
  return new Promise((resolve, reject) => {
    function tratarData(data) {
      if (data == "" || data == null || data == undefined || data == " ") {
        return null;
      }
      novaData = data.substring(0, 10).split("/").reverse().join("-");
      return novaData;
    }
    try {
      const readableStream = require("stream").Readable.from(csvFileBuffer);
      const tim_doc_center = grupo_economico === "FACELL" ? "tim_doc_center" : "tim_doc_center_fort";

      const results = [];
      readableStream
        .pipe(csv({ separator: ";" }))
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", async () => {
          let values = "";
          for (let i = 0; i < results.length; i++) {
            const row = results[i];

            let MIS_DATA_ATIVACAO = db.escape(tratarData(row["MIS_DATA_ATIVACAO"])) ?? null;
            let MIS_TIPO_ATIVACAO = db.escape(row["MIS_TIPO_ATIVACAO"]) ?? null;
            let MIS_SISTEMA = db.escape(row["MIS_SISTEMA"]) ?? null;
            let MIS_TELEFONE = db.escape(row["MIS_TELEFONE"]) ?? null;
            let MIS_TELEFONE_PORTADO = db.escape(row["MIS_TELEFONE_PORTADO"]) ?? null;
            let MIS_TELEFONE_PORTADO_TEMP = db.escape(row["MIS_TELEFONE_PORTADO_TEMP"]) ?? null;
            let MIS_STATUS_PORTADO = db.escape(row["MIS_STATUS_PORTADO"]) ?? null;
            let MIS_PLANO_ANTERIOR = db.escape(row["MIS_PLANO_ANTERIOR"]) ?? null;
            let MIS_TIPO_PLANO_ANTERIOR = db.escape(row["MIS_TIPO_PLANO_ANTERIOR"]) ?? null;
            let MIS_PLANO = db.escape(row["MIS_PLANO"]) ?? null;
            let MIS_TIPO_PLANO = db.escape(row["MIS_TIPO_PLANO"]) ?? null;
            let MIS_PACOTE = db.escape(row["MIS_PACOTE"]) ?? null;
            let MIS_TIPO_PACOTE = db.escape(row["MIS_TIPO_PACOTE"]) ?? null;
            let MIS_CONTRATO_BSCS = db.escape(row["MIS_CONTRATO_BSCS"]) ?? null;
            let MIS_SKY_CONTRATO = db.escape(row["MIS_SKY_CONTRATO"]) ?? null;
            let MIS_CPF_CNPJ_CLIENTE = db.escape(row["MIS_CPF_CNPJ_CLIENTE"]) ?? null;
            let MIS_TIPO_TECNOLOGIA = db.escape(row["MIS_TIPO_TECNOLOGIA"]) ?? null;
            let MIS_TIPO_ACEITE = db.escape(row["MIS_TIPO_ACEITE"]) ?? null;
            let MIS_CPF_VENDEDOR = db.escape(row["MIS_CPF_VENDEDOR"]) ?? null;
            let MIS_DATA_CHURN = db.escape(tratarData(row["MIS_DATA_CHURN"])) ?? null;
            let MIS_FIDEL_CODIGO = db.escape(row["MIS_FIDEL_CODIGO"]) ?? null;
            let MIS_FIDEL_DESCRICAO = db.escape(row["MIS_FIDEL_DESCRICAO"]) ?? null;
            let MIS_FIDEL_DESCONTO = db.escape(row["MIS_FIDEL_DESCONTO"]) ?? null;
            let SAP_CODIGO_TM = db.escape(row["SAP_CODIGO_TM"]) ?? null;
            let SAP_DESC_APARELHO = db.escape(row["SAP_DESC_APARELHO"]) ?? null;
            let SAP_DATA_CRIACAO = db.escape(tratarData(row["SAP_DATA_CRIACAO"])) ?? null;
            let SAP_DATA_MODIFICACAO = db.escape(tratarData(row["SAP_DATA_MODIFICACAO"])) ?? null;
            let DOC_TELEFONE = db.escape(row["DOC_TELEFONE"]) ?? null;
            let DOC_CONTRATO = db.escape(row["DOC_CONTRATO"]) ?? null;
            let DOC_CPF_CNPJ = db.escape(row["DOC_CPF_CNPJ"]) ?? null;
            let DOC_IMEI = db.escape(row["DOC_IMEI"]) ?? null;
            let DOC_DATA_ATIVACAO = db.escape(tratarData(row["DOC_DATA_ATIVACAO"])) ?? null;
            let DOC_DATA_IMPORTACAO = db.escape(tratarData(row["DOC_DATA_IMPORTACAO"])) ?? null;
            let DOC_DATA_ALTERACAO = db.escape(tratarData(row["DOC_DATA_ALTERACAO"])) ?? null;
            let DOC_DATA_CONTESTACAO = db.escape(tratarData(row["DOC_DATA_CONTESTACAO"])) ?? null;
            let DOC_DATA_ULTIMA_ALTERACAO = db.escape(tratarData(row["DOC_DATA_ULTIMA_ALTERACAO"])) ?? null;
            let DOC_OFERTA_ESPECIAL = db.escape(row["DOC_OFERTA_ESPECIAL"]) ?? null;
            let DOC_PROMOCAO = db.escape(row["DOC_PROMOCAO"]) ?? null;
            let DOC_MOTIVO_ENVIO = db.escape(row["DOC_MOTIVO_ENVIO"]) ?? null;
            let DOC_STATUS = db.escape(row["DOC_STATUS"]) ?? null;
            let DOC_DESCRICAO_ANOMALIA = db.escape(row["DOC_DESCRICAO_ANOMALIA"]) ?? null;
            let DOC_GRUPO_ANOMALIA = db.escape(row["DOC_GRUPO_ANOMALIA"]) ?? null;
            let DOC_ANOMALIA = db.escape(row["DOC_ANOMALIA"]) ?? null;
            let DOC_PLANO = db.escape(row["DOC_PLANO"]) ?? null;
            let DOC_ENVIO = db.escape(row["DOC_ENVIO"]) ?? null;
            let DOC_TIPO_ENVIO = db.escape(row["DOC_TIPO_ENVIO"]) ?? null;
            let DOC_LOGIN_IMPORTACAO = db.escape(row["DOC_LOGIN_IMPORTACAO"]) ?? null;
            let DOC_CANAL = db.escape(row["DOC_CANAL"]) ?? null;
            let DOC_EVENT_ID = db.escape(row["DOC_EVENT_ID"]) ?? null;
            let CAD_DSF_75 = db.escape(row["CAD_DSF_75"]) ?? null;
            let CAD_ID_PARCEIRO = db.escape(row["CAD_ID_PARCEIRO"]) ?? null;
            let CAD_CUSTCODE = db.escape(row["CAD_CUSTCODE"]) ?? null;
            let CAD_CNPJ_PDV = db.escape(row["CAD_CNPJ_PDV"]) ?? null;
            let CAD_CANAL_N0 = db.escape(row["CAD_CANAL_N0"]) ?? null;
            let CAD_CANAL_N2 = db.escape(row["CAD_CANAL_N2"]) ?? null;
            let CAD_CANAL_N3 = db.escape(row["CAD_CANAL_N3"]) ?? null;
            let CAD_CANAL_N4 = db.escape(row["CAD_CANAL_N4"]) ?? null;
            let CAD_OPERADORA = db.escape(row["CAD_OPERADORA"]) ?? null;
            let CAD_NOME_GE = db.escape(row["CAD_NOME_GE"]) ?? null;
            let CAD_RAZAO_SOCIAL = db.escape(row["CAD_RAZAO_SOCIAL"]) ?? null;
            let CAD_NOME_FANTASIA = db.escape(row["CAD_NOME_FANTASIA"]) ?? null;
            let CAD_NICKNAME = db.escape(row["CAD_NICKNAME"]) ?? null;
            let CAD_CIDADE = db.escape(row["CAD_CIDADE"]) ?? null;
            let CAD_ENDERECO = null;
            let CAD_UF = db.escape(row["CAD_UF"]) ?? null;
            let CAD_DDD = db.escape(row["CAD_DDD"]) ?? null;
            let CAD_GERENTE_CANAL = null;
            let CAD_COORDENADOR = null;
            let CAD_RESPONSAVEL_PDV = null;
            let CAD_STATUS_CADTIM = db.escape(row["CAD_STATUS_CADTIM"]) ?? null;
            let CAD_FOTOGRAFIA_CADTIM = db.escape(tratarData(row["CAD_FOTOGRAFIA_CADTIM"])) ?? null;
            let CAD_DSF_MASTER = null;
            let CAD_ID_MASTER = null;
            let CAD_NOME_MASTER = null;
            let CAD_REGIONAL_MASTER = null;
            let GU_MATRICULA = db.escape(row["GU_MATRICULA"]) ?? null;
            let GU_CPF = db.escape(row["GU_CPF"]) ?? null;
            let GU_NOME = db.escape(row["GU_NOME"]) ?? null;
            let REL_SLA_ENVIO_DOC = db.escape(row["REL_SLA_ENVIO_DOC"]) ?? null;
            let REL_SLA_LIBERACAO_DOC = db.escape(row["REL_SLA_LIBERACAO_DOC"]) ?? null;
            let REL_TITULARIDADE = db.escape(row["REL_TITULARIDADE"]) ?? null;
            let REL_CONTRATO_IGUAL_MIS_DOC = db.escape(row["REL_CONTRATO_IGUAL_MIS_DOC"]) ?? null;
            let REL_PLANO_IGUAL_MIS_DOC = db.escape(row["REL_PLANO_IGUAL_MIS_DOC"]) ?? null;
            let REL_MOTIVO_IGUAL_MIS_DOC = db.escape(row["REL_MOTIVO_IGUAL_MIS_DOC"]) ?? null;
            let REL_DATA_DIVULGACAO = db.escape(tratarData(row["REL_DATA_DIVULGACAO"])) ?? null;
            let REL_OBSERVACAO = db.escape(row["REL_OBSERVACAO"]) ?? null;

            values += `('${anoMes}-01', 
                        ${MIS_DATA_ATIVACAO}, ${MIS_TIPO_ATIVACAO}, ${MIS_SISTEMA}, ${MIS_TELEFONE}, ${MIS_TELEFONE_PORTADO}, ${MIS_TELEFONE_PORTADO_TEMP}, ${MIS_STATUS_PORTADO}, ${MIS_PLANO_ANTERIOR}, ${MIS_TIPO_PLANO_ANTERIOR}, ${MIS_PLANO}, ${MIS_TIPO_PLANO}, ${MIS_PACOTE}, ${MIS_TIPO_PACOTE}, ${MIS_CONTRATO_BSCS}, ${MIS_SKY_CONTRATO}, ${MIS_CPF_CNPJ_CLIENTE}, ${MIS_TIPO_TECNOLOGIA}, ${MIS_TIPO_ACEITE}, ${MIS_CPF_VENDEDOR}, ${MIS_DATA_CHURN}, ${MIS_FIDEL_CODIGO}, ${MIS_FIDEL_DESCRICAO}, ${MIS_FIDEL_DESCONTO}, ${SAP_CODIGO_TM}, ${SAP_DESC_APARELHO}, ${SAP_DATA_CRIACAO}, ${SAP_DATA_MODIFICACAO}, ${DOC_TELEFONE}, ${DOC_CONTRATO}, ${DOC_CPF_CNPJ}, ${DOC_IMEI}, ${DOC_DATA_ATIVACAO}, ${DOC_DATA_IMPORTACAO}, ${DOC_DATA_ALTERACAO}, ${DOC_DATA_CONTESTACAO}, ${DOC_DATA_ULTIMA_ALTERACAO}, ${DOC_OFERTA_ESPECIAL}, ${DOC_PROMOCAO}, ${DOC_MOTIVO_ENVIO}, ${DOC_STATUS}, ${DOC_DESCRICAO_ANOMALIA}, ${DOC_GRUPO_ANOMALIA}, ${DOC_ANOMALIA}, ${DOC_PLANO}, ${DOC_ENVIO}, ${DOC_TIPO_ENVIO}, ${DOC_LOGIN_IMPORTACAO}, ${DOC_CANAL}, ${DOC_EVENT_ID}, ${CAD_DSF_75}, ${CAD_ID_PARCEIRO}, ${CAD_CUSTCODE}, ${CAD_CNPJ_PDV}, ${CAD_CANAL_N0}, ${CAD_CANAL_N2}, ${CAD_CANAL_N3}, ${CAD_CANAL_N4}, ${CAD_OPERADORA}, ${CAD_NOME_GE}, ${CAD_RAZAO_SOCIAL}, ${CAD_NOME_FANTASIA}, ${CAD_NICKNAME}, ${CAD_CIDADE}, ${CAD_ENDERECO}, ${CAD_UF}, ${CAD_DDD}, ${CAD_GERENTE_CANAL}, ${CAD_COORDENADOR}, ${CAD_RESPONSAVEL_PDV}, ${CAD_STATUS_CADTIM}, ${CAD_FOTOGRAFIA_CADTIM}, ${CAD_DSF_MASTER}, ${CAD_ID_MASTER}, ${CAD_NOME_MASTER}, ${CAD_REGIONAL_MASTER}, ${GU_MATRICULA}, ${GU_CPF}, ${GU_NOME}, ${REL_SLA_ENVIO_DOC}, ${REL_SLA_LIBERACAO_DOC}, ${REL_TITULARIDADE}, ${REL_CONTRATO_IGUAL_MIS_DOC}, ${REL_PLANO_IGUAL_MIS_DOC}, ${REL_MOTIVO_IGUAL_MIS_DOC}, ${REL_DATA_DIVULGACAO}, ${REL_OBSERVACAO}),`;
          }
          values = values.slice(0, -1);

          var query = "";
          try {
            await db.execute(`DELETE FROM ${tim_doc_center} WHERE DATE_FORMAT(anoMes, '%Y-%m') = ? `, [anoMes]);

            query = `INSERT INTO ${tim_doc_center} (
                            anoMes, MIS_DATA_ATIVACAO, MIS_TIPO_ATIVACAO, MIS_SISTEMA, MIS_TELEFONE, MIS_TELEFONE_PORTADO, MIS_TELEFONE_PORTADO_TEMP, MIS_STATUS_PORTADO, MIS_PLANO_ANTERIOR, MIS_TIPO_PLANO_ANTERIOR, MIS_PLANO, MIS_TIPO_PLANO, MIS_PACOTE, MIS_TIPO_PACOTE, MIS_CONTRATO_BSCS, MIS_SKY_CONTRATO, MIS_CPF_CNPJ_CLIENTE, MIS_TIPO_TECNOLOGIA, MIS_TIPO_ACEITE, MIS_CPF_VENDEDOR, MIS_DATA_CHURN, MIS_FIDEL_CODIGO, MIS_FIDEL_DESCRICAO, MIS_FIDEL_DESCONTO, SAP_CODIGO_TM, SAP_DESC_APARELHO, SAP_DATA_CRIACAO, SAP_DATA_MODIFICACAO, DOC_TELEFONE, DOC_CONTRATO, DOC_CPF_CNPJ, DOC_IMEI, DOC_DATA_ATIVACAO, DOC_DATA_IMPORTACAO, DOC_DATA_ALTERACAO, DOC_DATA_CONTESTACAO, DOC_DATA_ULTIMA_ALTERACAO, DOC_OFERTA_ESPECIAL, DOC_PROMOCAO, DOC_MOTIVO_ENVIO, DOC_STATUS, DOC_DESCRICAO_ANOMALIA, DOC_GRUPO_ANOMALIA, DOC_ANOMALIA, DOC_PLANO, DOC_ENVIO, DOC_TIPO_ENVIO, DOC_LOGIN_IMPORTACAO, DOC_CANAL, DOC_EVENT_ID, CAD_DSF_75, CAD_ID_PARCEIRO, CAD_CUSTCODE, CAD_CNPJ_PDV, CAD_CANAL_N0, CAD_CANAL_N2, CAD_CANAL_N3, CAD_CANAL_N4, CAD_OPERADORA, CAD_NOME_GE, CAD_RAZAO_SOCIAL, CAD_NOME_FANTASIA, CAD_NICKNAME, CAD_CIDADE, CAD_ENDERECO, CAD_UF, CAD_DDD, CAD_GERENTE_CANAL, CAD_COORDENADOR, CAD_RESPONSAVEL_PDV, CAD_STATUS_CADTIM, CAD_FOTOGRAFIA_CADTIM, CAD_DSF_MASTER, CAD_ID_MASTER, CAD_NOME_MASTER, CAD_REGIONAL_MASTER, GU_MATRICULA, GU_CPF, GU_NOME, REL_SLA_ENVIO_DOC, REL_SLA_LIBERACAO_DOC, REL_TITULARIDADE, REL_CONTRATO_IGUAL_MIS_DOC, REL_PLANO_IGUAL_MIS_DOC, REL_MOTIVO_IGUAL_MIS_DOC, REL_DATA_DIVULGACAO, REL_OBSERVACAO) VALUES ${values}`;

            await db.execute(query);

            // Gerar cruzamento:
            await cruzarDocCenter(anoMes, grupo_economico);
            resolve();
            return true;
          } catch (error) {
            console.log("Erro ao tentar importar doc_center tim :" + error);
            let caminhoLog = path.resolve(__dirname, "src", "importDocCenterQuery.sql");
            fs.writeFileSync(caminhoLog, query);
            reject(error);
          }
        })
        .on("error", (error) => {
          console.log("Erro ao tentar importar doc_center tim :" + error);
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
}

// Cruzamento com Ativações
function cruzarDocCenter(anoMes, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    const tim_doccenter = grupo_economico === "FACELL" ? "tim_doc_center" : "tim_doc_center_fort";
    const facell_docs = grupo_economico === "FACELL" ? "facell_docs" : "facell_docs_fort";
    const facell_docs_pendentes = grupo_economico === "FACELL" ? "facell_docs_pendentes" : "facell_docs_pendentes_fort";

    var [rowsDocCenter] = await db.execute(
      `SELECT 
        dc.MIS_DATA_ATIVACAO,
        dc.MIS_TIPO_ATIVACAO,
        dc.MIS_TELEFONE,
        dc.MIS_PLANO_ANTERIOR,
        dc.MIS_TIPO_PLANO_ANTERIOR,
        dc.MIS_PLANO,
        dc.MIS_TIPO_PLANO,
        dc.MIS_CPF_CNPJ_CLIENTE,
        dc.CAD_UF,
        dc.GU_MATRICULA,
        dc.GU_CPF,
        dc.GU_NOME,
        f.filial
        FROM ${tim_doccenter} dc
        LEFT JOIN tim_pdvs f ON dc.CAD_CUSTCODE = f.custcode
        WHERE dc.DOC_STATUS LIKE '%Não encaminhado%' and DATE_FORMAT(dc.MIS_DATA_ATIVACAO, '%Y-%m') = ? `,
      [anoMes]
    );

    values = "";
    for (let i = 0; i < rowsDocCenter.length; i++) {
      // console.log(`Passando pela doc ${i}/${rowsDocCenter.length}`)
      const doc = rowsDocCenter[i];
      const limiteDias = 30;
      const data_ativacao = new Date(doc["MIS_DATA_ATIVACAO"] + " 00:00");
      var diferencaDias;
      var diferencaMilissegundos;

      let status = "Lançado";
      let tipo_servico = "";

      // Verificar se existe lançamento em Documentações
      const [rowsDocs] = await db.execute(
        `SELECT gsm, gsmProvisorio, dtAtivacao, thales_status_servico FROM ${facell_docs} WHERE DATE_FORMAT(dtAtivacao, '%Y-%m') >= ? and (gsm = ? OR gsmProvisorio = ?) LIMIT 1`,
        [anoMes, doc["MIS_TELEFONE"], doc["MIS_TELEFONE"]]
      );

      // Definir tipo de status

      const lancamento = (rowsDocs && rowsDocs[0]) || null;

      if (!lancamento) {
        const data_atual = new Date();

        diferencaMilissegundos = data_atual - data_ativacao;
        diferencaDias = diferencaMilissegundos / (1000 * 60 * 60 * 24);

        if (diferencaDias > limiteDias) {
          status = "Prazo perdido!";
        } else {
          status = "Não lançado - Datasys";
        }
      } else {
        if (lancamento["thales_status"] === "Não enviado") {
          let data_lancamento = new Date(rowsDocs[0]["dtAtivacao"] + " 00:00");

          diferencaMilissegundos = data_lancamento - data_ativacao;
          diferencaDias = diferencaMilissegundos / (1000 * 60 * 60 * 24);

          if (diferencaDias > limiteDias) {
            status = "Prazo perdido!";
          } else {
            status = "Não lançado - Thales";
          }
        } else {
          if (diferencaDias > limiteDias) {
            status = "Lançado fora do prazo!";
          } else {
            status = "Lançado";
          }
        }
      }

      // Analisar o tipo de serviço
      let tipo_plano_anterior = doc["MIS_TIPO_PLANO_ANTERIOR"]?.toLowerCase();
      if (!tipo_plano_anterior) {
        tipo_servico = "Ativação";
      } else if (tipo_plano_anterior === "pré-pago") {
        tipo_servico = "Migração";
      } else {
        tipo_servico = "Upgrade/Downgrade";
      }

      values += `(
                    '${anoMes}-01',
                    ${db.escape(status)},
                    ${db.escape(tipo_servico)},
                    ${db.escape(doc["CAD_UF"] || null)},
                    ${db.escape(doc["filial"] || null)},
                    ${db.escape(doc["MIS_DATA_ATIVACAO"] || null)},
                    ${db.escape(doc["MIS_TIPO_ATIVACAO"] || null)},
                    ${db.escape(doc["MIS_TELEFONE"] || null)},
                    ${db.escape(doc["MIS_PLANO_ANTERIOR"] || null)},
                    ${db.escape(doc["MIS_TIPO_PLANO_ANTERIOR"] || null)},
                    ${db.escape(doc["MIS_PLANO"] || null)},
                    ${db.escape(doc["MIS_TIPO_PLANO"] || null)},
                    ${db.escape(doc["MIS_CPF_CNPJ_CLIENTE"] || null)},
                    ${db.escape(doc["GU_MATRICULA"] || null)},
                    ${db.escape(doc["GU_CPF"] || null)},
                    ${db.escape(doc["GU_NOME"] || null)}
                    ),`;
    }
    values = values.slice(0, -1);

    var query = "";
    try {
      if (values) {
        await db.execute(`DELETE FROM ${facell_docs_pendentes} WHERE DATE_FORMAT(anoMes, '%Y-%m') = ?`, [anoMes]);
        query = `INSERT INTO ${facell_docs_pendentes} (
                anoMes,
                status,
                tipo_servico,
                uf,
                filial,
                data_ativacao,
                tipo_ativacao,
                gsm,
                plano_anterior,
                tipo_plano_anterior,
                plano_destino,
                tipo_plano_destino,
                cpf_cliente,
                gu_matricula,
                gu_cpf,
                gu_nome
                    ) VALUES ${values}`;

        const [result] = await db.execute(query);
        resolve(result.affectedRows);
      } else {
        resolve(0);
      }
      return true;
    } catch (error) {
      console.log(query);
      // console.log(error)
      reject(error);
      return false;
    }
  });
}

async function old_listarLinhasPendentesDeLancamento(anoMes, filial = null, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    try {
      const facell_docs_pendentes = grupo_economico === "FACELL" ? "facell_docs_pendentes" : "facell_docs_pendentes_fort";
      var rows = [];
      if (filial) {
        [rows] = await db.execute(`SELECT * FROM ${facell_docs_pendentes} WHERE anoMes = ? and filial = ?`, [`${anoMes}-01`, filial]);
      } else {
        [rows] = await db.execute(`SELECT * FROM ${facell_docs_pendentes} WHERE anoMes = ?`, [`${anoMes}-01`]);
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

// Importação do DocCenter
async function importarDocCenter(anoMes, buffer, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    function excelToDate(excelDate) {
      // O número de dias entre 1 de janeiro de 1900 e 1 de janeiro de 1970
      const daysBetween = 25568;
    
      // Convertendo o número de dias do Excel para milissegundos
      const excelToMS = (excelDate - daysBetween) * 24 * 60 * 60 * 1000;
    
      // Criando um objeto Date
      const date = new Date(excelToMS);
    
      return date;
    }

    try {
      const workbook = XLSX.read(buffer, { type: "buffer" });

      // Escolher a planilha desejada (por nome ou índice)
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Converter a planilha em um objeto JSON
      var results = XLSX.utils.sheet_to_json(worksheet);

      const facell_servicos_nao_lancados = grupo_economico === "FACELL" ? "facell_servicos_nao_lancados" : "facell_servicos_nao_lancados";
      const [filiais] = await db.execute("SELECT grupo_economico, cnpj, filial FROM tim_pdvs");

      let values = "";
      for (let i = 0; i < results.length; i++) {
        const row = results[i];
        if(!row['MIS_TELEFONE'] && !row["MIS_CPF_CNPJ_CLIENTE"]){
          continue;
        }
        let MIS_DATA_ATIVACAO = db.escape(excelToDate(row['MIS_DATA_ATIVACAO']));
        let MIS_TIPO_ATIVACAO = db.escape(row["MIS_TIPO_ATIVACAO"] || null);
        let MIS_TELEFONE = db.escape(row["MIS_TELEFONE"] || null);
        let MIS_PLANO_ANTERIOR = db.escape(row["MIS_PLANO_ANTERIOR"] || null);
        let MIS_PLANO = db.escape(row["MIS_PLANO"] || null);
        let MIS_CPF_CNPJ_CLIENTE = db.escape(row["MIS_CPF_CNPJ_CLIENTE"] || null);
        let DOC_STATUS = db.escape(row["DOC_STATUS"] || null);
        let CAD_CNPJ_PDV = db.escape(row["CAD_CNPJ_PDV"] || null);
        let CAD_NICKNAME = db.escape(row["CAD_NICKNAME"] || null);
        let GU_MATRICULA = db.escape(row["GU_MATRICULA"] || null);
        let GU_NOME = db.escape(row["GU_NOME"] || null);

        let status = db.escape(row["STATUS"] || null);
        let tipo_servico = db.escape(row["TIPO DE SERVIÇO"] || null);

        const filial_localizada = filiais.find((filial) => parseInt(filial.cnpj) === parseInt(row["CAD_CNPJ_PDV"]));

        let grupo_economico = filial_localizada ? db.escape(filial_localizada["grupo_economico"]) : db.escape("NÃO IDENTIFICADO");
        let filial = filial_localizada ? db.escape(filial_localizada["filial"]) : db.escape("NÃO IDENTIFICADO");
        let obs = db.escape(row["OBS"] || null);

        values += `\n('${anoMes}-01', ${MIS_DATA_ATIVACAO}, ${MIS_TIPO_ATIVACAO}, ${MIS_TELEFONE}, ${MIS_PLANO_ANTERIOR},  ${MIS_PLANO}, ${MIS_CPF_CNPJ_CLIENTE}, ${DOC_STATUS}, ${CAD_CNPJ_PDV}, ${CAD_NICKNAME}, ${GU_MATRICULA}, ${GU_NOME}, ${status}, ${tipo_servico}, ${grupo_economico}, ${filial}, ${obs}),`;
      }
      values = values.slice(0, -1);
      var query = "";
      try {
        await db.execute(`DELETE FROM ${facell_servicos_nao_lancados} WHERE DATE_FORMAT(anoMes, '%Y-%m') = ? `, [anoMes]);

        query = `INSERT INTO ${facell_servicos_nao_lancados} (anoMes, data_ativacao, tipo_ativacao, gsm, plano_anterior, plano, cpf_cliente, doc_status, cnpj, nickname, gu_matricula, gu_nome, status, tipo_servico, grupo_economico, filial, obs) VALUES \n${values}`;
        // console.log(query)
        await db.execute(query);
        resolve();
        return true;
      } catch (error) {
        console.log("Erro ao tentar importar doc_center tim :" + error);
        reject(error);
        return false;
      }
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

async function listarLinhasPendentesDeLancamento(anoMes, filial = null, grupo_economico) {
  return new Promise(async (resolve, reject) => {
    try {
      const facell_servicos_nao_lancados = grupo_economico === "FACELL" ? "facell_servicos_nao_lancados" : "facell_servicos_nao_lancados";
      var rows = [];
      if (filial) {
        [rows] = await db.execute(`SELECT * FROM ${facell_servicos_nao_lancados} WHERE anoMes = ? and filial = ?`, [`${anoMes}-01`, filial]);
      } else {
        [rows] = await db.execute(`SELECT * FROM ${facell_servicos_nao_lancados} WHERE anoMes = ?`, [`${anoMes}-01`]);
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

module.exports = {
  importarDocCenter,
  cruzarDocCenter,
  listarLinhasPendentesDeLancamento,
};
