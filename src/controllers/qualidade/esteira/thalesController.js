"use strict";
const { logger } = require("../../../../logger");
const { db } = require("../../../../mysql");
const fs = require('fs');
const { Readable } = require('stream');
const csvParser = require("csv-parser")

function tratarDateTime(dataString) {
  if (!dataString) return null;
  // Divide a string em partes usando '/' e ' ' como delimitadores
  const partes = dataString.split(/[/ ]/);

  // Obtém as partes da data
  const dia = partes[0];
  const mes = partes[1];
  const ano = partes[2];
  const horaMinutos = partes[3];

  // Formata a data no formato 'YYYY-MM-DD HH:mm:ss'
  const dataFormatada = `${ano}-${mes}-${dia} ${horaMinutos}:00`;
  return dataFormatada
}

async function importarPacotesThales(req, res) {
  let conn;
  try {
    const file = req.file;
    const dataInicial = req.body?.dataInicial;
    const dataFinal = req.body?.dataFinal;
    const grupo_economico = req.body?.grupo_economico;

    if (!file) throw new Error("Buffer não recebido!");
    if (!grupo_economico) throw new Error("Grupo econômico não recebido!");

    conn = await db.getConnection();

    const tim_thales = grupo_economico === 'FACELL' ? ' tim_thales ' : ' tim_thales_fort ';

    // Converte o buffer em uma stream legível
    const readable = new Readable();
    readable._read = () => { }; // Função vazia, pois a stream já terá dados
    readable.push(file.buffer);
    readable.push(null); // Indica que o fluxo terminou

    const result = await new Promise((resolve, reject) => {
      const data = [];
      readable
        .pipe(csvParser({ separator: '|' })) // O parser vai separar as colunas automaticamente
        .on('data', (row) => {
          // console.log(row);

          data.push(row);
        })
        .on('end', async () => {
          const values = []
          if (data.length === 0) {
            reject('Arquivo vazio!')
          }
          for (let i = 0; i < data.length; i++) {
            if (i == 3) break;

            const linha = data[i]
            let primeiraChave = null

            let keys = Object.keys(linha)
            for (let k = 0; k < 1; k++) {
              primeiraChave = keys[k];
            }

            let gsm = db.escape(linha[primeiraChave] || null)
            let cpf_cliente = db.escape(linha['CPF'] || null)
            let cnpj_cliente = db.escape(linha['CNPJ'] || null)
            let id_pacote = db.escape(linha['ID do pacote'])
            let operacao = db.escape(linha['Operação'] || null)
            let tipo_cliente = db.escape(linha['Tipo de cliente'] || null)
            let subtipo_cliente = db.escape(linha['Subtipo de cliente'] || null)
            let numero_contrato = db.escape(linha['Número do Contrato'] || null)
            let plano = db.escape(linha['Nome do Plano'] || null)
            let imei = db.escape(linha['IMEI'] || null)
            let condicao_pgto = db.escape(linha['Condição de Pagamento'] || null)
            let valor_entrada = db.escape(linha['Valor de Entrada'] || null)
            let desconto = db.escape(linha['Desconto'] || null)
            let qtde_parcelas_cartao_1 = db.escape(linha['Quantidade de Parcelas Cartão 1'] || null)
            let qtde_parcelas_cartao_2 = db.escape(linha['Quantidade de Parcelas Cartão 2'] || null)
            let valor_cartao_1 = db.escape(linha['Valor no Cartão de Crédito 1'] || null)
            let valor_cartao_2 = db.escape(linha['Valor no Cartão de Crédito 2'] || null)
            let cod_aut_cartao_1 = db.escape(linha['Código de Autorização Cartão 1'] || null)
            let cod_aut_cartao_2 = db.escape(linha['Código de Autorização Cartão 2'] || null)
            let data_criacao = db.escape(tratarDateTime(linha['Data de Criação'] || null))
            let data_transacao = db.escape(linha['Data da Transação'] || null)
            let data_modificacao = db.escape(tratarDateTime(linha['Data da Última Modificação do Status'] || null))
            let status = db.escape(linha['Status detalhado'] || null)
            let historico = db.escape(linha['Histórico de Alterações'] || null)
            let matricula = db.escape(linha['Usuário criador do pacote'] || null)
            let canal = db.escape(linha['Canal de venda detalhado'] || null)
            let custcode = db.escape(linha['Código da Loja'] || null)
            let id_grupo = db.escape(linha['ID Grupo Econômico'] || null)
            let activ_code = db.escape(linha['Activ-Code'] || null)
            let fidelizacao = db.escape(linha['Fidelização'] || null)

            const value = `(${gsm}, ${cpf_cliente}, ${cnpj_cliente}, ${id_pacote}, ${operacao}, ${tipo_cliente}, ${subtipo_cliente}, ${numero_contrato}, ${plano}, ${imei}, ${condicao_pgto}, ${valor_entrada}, ${desconto}, ${qtde_parcelas_cartao_1}, ${qtde_parcelas_cartao_2}, ${valor_cartao_1}, ${valor_cartao_2}, ${cod_aut_cartao_1}, ${cod_aut_cartao_2}, ${data_criacao}, ${data_transacao}, ${data_modificacao}, ${status}, ${historico}, ${matricula}, ${canal}, ${custcode}, ${id_grupo}, ${activ_code}, ${fidelizacao})`

            values.push(value)
          }

          var query = ''
          try {

            if (values.length > 0) {
              // console.log(values);

              query = `INSERT INTO ${tim_thales} 
                    (gsm, cpf_cliente, cnpj_cliente, id_pacote, operacao, tipo_cliente, subtipo_cliente, numero_contrato, plano, imei, condicao_pgto, valor_entrada, desconto, qtde_parcelas_cartao_1, qtde_parcelas_cartao_2, valor_cartao_1, valor_cartao_2, cod_aut_cartao_1, cod_aut_cartao_2, data_criacao, data_transacao, data_modificacao, status, historico, matricula, canal, custcode, id_grupo, activ_code, fidelizacao) 
                    VALUES ${values.join(',')} 
                    ON DUPLICATE KEY UPDATE
                    data_modificacao = VALUES(data_modificacao),
                    status = VALUES(status),
                    historico = VALUES(historico),
                    gsm = VALUES(gsm),
                    cpf_cliente = VALUES(cpf_cliente),
                    cnpj_cliente = VALUES(cnpj_cliente),
                    operacao = VALUES(operacao),
                    imei = VALUES(imei),
                    condicao_pgto = VALUES(condicao_pgto),
                    valor_entrada = VALUES(valor_entrada),
                    desconto = VALUES(desconto),
                    qtde_parcelas_cartao_1 = VALUES(qtde_parcelas_cartao_1),
                    qtde_parcelas_cartao_2 = VALUES(qtde_parcelas_cartao_2),
                    valor_cartao_1 = VALUES(valor_cartao_1),
                    valor_cartao_2 = VALUES(valor_cartao_2),
                    cod_aut_cartao_1 = VALUES(cod_aut_cartao_1),
                    cod_aut_cartao_2 = VALUES(cod_aut_cartao_2),
                    fidelizacao = VALUES(fidelizacao)
                    ;
                    `

              // console.log(query)
              await conn.execute(query)

              if (dataInicial && dataFinal) {
                await processarDocs({ dataInicial, dataFinal, grupo_economico })
              }
            }
            resolve(data.length)
          } catch (error) {
            // console.log('Erro na importação', error)
            reject('Erro na importação do CSV')
          }
        })
        .on('error', (error) => {
          // console.log('Erro no processamento', error);

          reject('Erro no processamento do CSV')
        })
    })
    const relatorio_esteira = grupo_economico == 'FACELL' ? 'thales-facell' : 'thales-fort';
    await conn.execute(`UPDATE facell_esteira_att SET data = now() WHERE relatorio = ?`, [relatorio_esteira])
    
    res.status(200).json({ qtde: result || 0 })
  } catch (error) {
    console.log(error);

    logger.error({
      origin: 'QUALIDADE', module: 'ESTEIRA', method: 'IMPORTAR_THALES',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}

// THALES
async function listarDocs(req) {
  return new Promise(async (resolve, reject) => {
    const {
      anoMes,
      filial,
      grupo_economico,
      comLiberados
    } = req.body

    const conn = await db.getConnection()
    try {

      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
      const relatorio = grupo_economico == 'FACELL' ? 'thales-facell' : 'thales-fort';

      if (!grupo_economico) {
        reject('[LISTAR_DOCS]: Grupo não informado!')
        return false;
      }
      if (!anoMes) {
        reject('[LISTAR_DOCS]: anoMes não informado!')
        return false;
      }

      let filtros = []
      let parametros = []

      if (!comLiberados) {
        filtros.push(` and thales_status <> 'Liberado' `)
      }

      filtros.push(" and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? ")
      parametros.push(anoMes)

      if (grupo_economico) {
        filtros.push(' and grupo_economico = ? ')
        parametros.push(grupo_economico)
      }

      if (filial) {
        filtros.push(' and filial = ? ')
        parametros.push(filial)
      }

      const [docs] = await conn.execute(
        `SELECT id, thales_status, thales_status_servico, thales_status_aparelho, hashtags, dtAtivacao, pedido, gsm, gsmProvisorio, imei, filial, vendedor, thales_operacao, modalidade, plaOpera, aparelho, cpf_cliente, cliente, obs_doc, obs_doc_adm, fidAparelho, fidPlano, statusLinha
          FROM ${facell_docs}
            WHERE statusLinha <> 'CANCELADA' and statusLinha <> 'DUPLICIDADE' and (hashtags IS NOT NULL OR thales_status NOT IN('Liberado sem envio')) ${filtros.join(' ')} `,
        parametros
      );

      const [rowUltimaAtt] = await conn.execute(`SELECT data FROM facell_esteira_att WHERE relatorio = ? `, [relatorio])
      const ultimaAtt = rowUltimaAtt && rowUltimaAtt[0] && rowUltimaAtt[0]['data'] || null

      resolve({ docs, ultimaAtt });
    } catch (error) {
      reject(error);
    } finally {
      conn.release()
    }
  });
}
async function exportarLinhas({
  anoMes,
  filial,
  grupo_economico
}) {
  return new Promise(async (resolve, reject) => {
    try {

      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
      if (!grupo_economico) {
        reject('[LISTAR_DOCS]: Grupo não informado!')
        return false;
      }
      if (!anoMes) {
        reject('[LISTAR_DOCS]: anoMes não informado!')
        return false;
      }

      let filtros = []
      let parametros = []

      filtros.push(" and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? ")
      parametros.push(anoMes)

      if (grupo_economico) {
        filtros.push(' and grupo_economico = ? ')
        parametros.push(grupo_economico)
      }

      if (filial) {
        filtros.push(' and filial = ? ')
        parametros.push(filial)
      }
      // const campos = `id, thales_status, thales_status_servico, thales_status_aparelho, hashtags, dtAtivacao, pedido, gsm, gsmProvisorio, imei, filial, vendedor, thales_operacao, modalidade, plaOpera, aparelho, cpf_cliente, cliente, obs_doc, obs_doc_adm, fidAparelho, fidPlano, statusLinha`
      const campos = ' * ';
      const [docs] = await db.execute(
        `SELECT ${campos}
          FROM ${facell_docs}
            WHERE 1 ${filtros.join(' ')} `,
        parametros
      );

      resolve(docs);
      return false;
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

async function thalesCharts({
  anoMes,
  filial,
  grupo_economico,
  dataInicial,
  dataFinal,
}) {
  return new Promise(async (resolve, reject) => {
    try {
      var parametros = [anoMes];
      var resumo_status = [];
      var resumo_filial = [];
      if (!grupo_economico) {
        reject('[THALES CHARTS]: Grupo não informado!')
        return false;
      }

      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

      var filtros_where = "";
      if (filial) {
        filtros_where += " and filial = ?";
        parametros.push(filial);
      }
      if (dataInicial) {
        filtros_where += " and dtAtivacao >= ?";
        parametros.push(dataInicial);
      }
      if (dataFinal) {
        filtros_where += " and dtAtivacao <= ?";
        parametros.push(dataFinal);
      }

      [resumo_status] = await db.execute(
        `SELECT thales_status as status, count(id) as qtde FROM  ${facell_docs}
                WHERE grupo_economico = '${grupo_economico}' and statusLinha <> 'DUPLICIDADE' and thales_status <> 'Liberado sem envio' and DATE_FORMAT(dtAtivacao, '%Y-%m') = ?  ${filtros_where}
                GROUP BY thales_status`,
        parametros
      );

      if (filial) {
        [resumo_filial] = await db.execute(
          `SELECT 
          vendedor,
          SUM(CASE WHEN thales_status <> 'Liberado'  THEN 1 ELSE 0 END) AS nao_liberado,
          count(id) as total FROM  ${facell_docs}
          WHERE thales_status <> 'Liberado sem envio' and statusLinha <> 'DUPLICIDADE' and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? ${filtros_where}
          GROUP BY vendedor`,
          parametros
        );
      } else {
        [resumo_filial] = await db.execute(
          `SELECT 
          filial,
          SUM(CASE WHEN thales_status <> 'Liberado'  THEN 1 ELSE 0 END) AS nao_liberado,
          count(id) as total FROM  ${facell_docs}
          WHERE thales_status <> 'Liberado sem envio' and statusLinha <> 'DUPLICIDADE' and DATE_FORMAT(dtAtivacao, '%Y-%m') = ? ${filtros_where}
          GROUP BY filial`,
          parametros
        );
      }

      resolve({ resumo_status, resumo_filial });
      return false;
    } catch (error) {
      reject(error);
      return false;
    }
  });
}

function converteStatusThales(status) {
  if (!status) return null;
  if (status === "green") return "Liberado";
  if (status === "red") return "Anomalia Definitiva";
  if (status === "yellow") return "Anomalia Temporária";
  if (status === "black") return "Fraude";
  if (status === "purple") return "Em analise";

  return "Não enviado";
}
async function processarDocs({
  dataInicial,
  dataFinal,
  grupo_economico,
}) {
  if (!dataInicial || !dataFinal) return false;

  return new Promise(async (resolve, reject) => {
    let conn
    try {
      if (!grupo_economico) {
        throw new Error('Grupo não informado!')
      }
      const grupo_economico_local = grupo_economico;
      const dtInicial = dataInicial;
      const dtFinal = dataFinal;

      const datasys_ativacoes = grupo_economico_local === 'FACELL' ? 'datasys_ativacoes' : 'datasys_ativacoes_fort';
      const facell_docs = grupo_economico_local === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
      const tim_thales = grupo_economico_local === 'FACELL' ? 'tim_thales' : 'tim_thales_fort';

      conn = await db.getConnection();
      await conn.beginTransaction();

      // Passar pelas ativações do período por meio da tabela datasys_ativacoes
      var [ativacoes] = await db.execute(
        `SELECT * FROM ${datasys_ativacoes} 
            WHERE 
                NOT modalidade LIKE '%TROCA DE CHIP%'  
                AND NOT modalidade LIKE '%C6 BANK%'   
                AND DATE(dtAtivacao) BETWEEN ? AND ? `,
        [dtInicial, dtFinal]
      );

      var docs = [];
      var qtdeAtivacoes = ativacoes.length;
      for (let a = 0; a < ativacoes.length; a++) {
        var ativacao = ativacoes[a];

        ativacao.cpf = ativacao.cpf.replace(/[\/'\\]/g, "");
        ativacao.thales_status = "Liberado sem envio";
        ativacao.thales_status_servico = null;
        ativacao.thales_status_aparelho = null;

        ativacao.imei =
          ativacao.imei === null ? null : ativacao.imei.replace(/[\/\\']/g, "");
        ativacao.thales_historico = null;
        ativacao.thales_fidelizacao = null;
        ativacao.thales_data_criacao = null;
        ativacao.thales_data_modificacao = null;
        ativacao.thales_plano = null;
        ativacao.thales_id_pacote = null;
        ativacao.thales_operacao = null;

        var modalidade = ativacao.modalidade?.toLowerCase() || "";
        var plaOpera = ativacao.plaOpera?.toLowerCase() || "";

        var gsm = ativacao.gsm || null;
        var gsmProvisorio = ativacao.gsmProvisorio || null;

        var isImportant = false;
        var hasServico = true;
        var hasAparelho = false;
        var isPortab = false;
        var hashtags = "";
        var hasHashtagServico = false;
        var hasHashtagAparelho = false;
        var gsmConsulta = null;
        var statusLinha = ativacao.statusLinha?.toLowerCase()

        // Verificar o que precisaria de envio GROSS, TROCA DE APARELHO...
        if (
          modalidade.includes("ativ") ||
          modalidade.includes("port") ||
          modalidade.includes("migra") ||
          modalidade.includes("depe") ||
          modalidade.includes("upgr") ||
          modalidade.includes("troca de aparelho")
        ) {
          isImportant = true;
        }

        if (modalidade && modalidade.includes("porta")) {
          isPortab = true;
          gsmConsulta = ativacao.gsmProvisorio || ativacao.gsm
        } else {
          gsmConsulta = ativacao.gsm
        }
        // Do que classificamos acima, vamos retirar o que não precisa de envio
        // Retira Controle Express, menos o que for Upgrade Express
        if (
          /controle.*express|express.*controle/.test(plaOpera) || plaOpera?.includes('controle express')
        ) {
          isImportant = false;
        }

        // Retirar Pré-pago
        if (modalidade.includes("pré-pago")) {
          isImportant = false;
        }

        if (ativacao.imei && ativacao.imei.length > 5) {
          hasAparelho = true;

          if (modalidade.includes("troca de aparelho")) {
            hasServico = false;

            // Retira black c light ou Retira o que for aparelho sem fidelização de plano e aparelho
            if (
              plaOpera.includes("black c light") ||
              (ativacao.fidAparelho !== "SIM" && ativacao.fidPlano !== "SIM")
            ) {
              isImportant = false;
              ativacao.thales_status = "Liberado";
              ativacao.thales_status_aparelho = "Liberado";
            }
          }
        }

        if (isImportant) {
          // console.log(
          //   `Ativação: ${a} de ${qtdeAtivacoes} | ${(
          //     (a / qtdeAtivacoes) *
          //     100
          //   ).toFixed(2)}%`
          // );

          if (hasAparelho) {
            // Altera o gsm de consulta para gsmProvisório em caso de portabilidade:
            var rowsThalesAparelho;

            // Procura se existe pacote de aparelho Libeardo
            [rowsThalesAparelho] = await conn.execute(
              `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao, condicao_pgto FROM  ${tim_thales}
                        WHERE 
                        DATE(data_criacao) >= ? and imei = ? and gsm = ? and status = 'green'
                        ORDER BY data_criacao DESC LIMIT 1`,
              [ativacao.dtAtivacao, ativacao.imei, gsmConsulta]
            );
            if (!(rowsThalesAparelho && rowsThalesAparelho?.length)) {

              // Procurar por outros pacotes de aparelho no Thales
              [rowsThalesAparelho] = await conn.execute(
                `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao, condicao_pgto FROM  ${tim_thales}
                WHERE 
                DATE(data_criacao) >= ? and imei = ? and gsm = ?
                ORDER BY data_criacao DESC LIMIT 1`,
                [ativacao.dtAtivacao, ativacao.imei, gsmConsulta]
              );
            }

            if (rowsThalesAparelho.length === 0) {
              [rowsThalesAparelho] = await conn.execute(
                `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao, condicao_pgto FROM  ${tim_thales}
                          WHERE 
                          DATE(data_criacao) >= ? and imei = ?
                          ORDER BY data_criacao DESC LIMIT 1`,
                [ativacao.dtAtivacao, ativacao.imei]
              );
            }


            if (rowsThalesAparelho.length) {
              // Análise de divergências
              // #Motivo envio
              if (rowsThalesAparelho[0]["operacao"]?.toLowerCase().includes('sem reembolso')) {
                hashtags += " #operacao";
                hasHashtagAparelho = true;
              }

              // #GSM
              if (isPortab) {
                if (rowsThalesAparelho[0]["gsm"] != ativacao.gsmProvisorio) {
                  hashtags += " #gsmProv";
                  hasHashtagAparelho = true;
                }
              } else {
                if (rowsThalesAparelho[0]["gsm"] != ativacao.gsm) {
                  hashtags += " #gsm";
                  hasHashtagAparelho = true;
                }
              }

              // Análise se é Parcelamento com juros
              if (
                rowsThalesAparelho[0]["condicao_pgto"] ==
                "Parcelamento com Juros"
              ) {
                hashtags += " #juros";
                hasHashtagAparelho = true;
              }

              if (!!rowsThalesAparelho[0]["cnpj_cliente"]) {
                console.log(ativacao.cpf, rowsThalesAparelho[0]["cnpj_cliente"])
                if (ativacao.cpf !== rowsThalesAparelho[0]["cnpj_cliente"]) {
                  hashtags += '#cnpj'
                  hasHashtagAparelho = true
                }
              } else {
                if (ativacao.cpf !== rowsThalesAparelho[0]["cpf_cliente"]) {
                  hashtags += " #cpf";
                  hasHashtagAparelho = true;
                }
              }


              // Análise de fidelização de aparelho
              if (
                ativacao.fidAparelho?.toLowerCase() === "sim" &&
                !rowsThalesAparelho[0]["operacao"]
                  ?.toLowerCase()
                  .includes("fid_base") &&
                !rowsThalesAparelho[0]["operacao"]
                  ?.toLowerCase()
                  .includes("fidelidade de aparelho")
              ) {
                const fids = rowsThalesAparelho[0]["fidelizacao"]?.split("");
                if (!fids || fids[1] == "0") {
                  if (!ativacao?.aparelho?.toLowerCase().includes('wttx')) {
                    hashtags += " #fidAparelho";
                    hasHashtagAparelho = true;
                  }
                }
              }

              let statusAparelho = converteStatusThales(rowsThalesAparelho[0]["status"]);
              ativacao.thales_status_aparelho = `${statusAparelho}${hasHashtagAparelho === true && statusAparelho !== 'Não enviado' ? " #" : ""}`;

              ativacao.thales_historico = rowsThalesAparelho[0]["historico"];
              ativacao.thales_fidelizacao =
                rowsThalesAparelho[0]["fidelizacao"];
              ativacao.thales_data_criacao =
                rowsThalesAparelho[0]["data_criacao"];
              ativacao.thales_data_modificacao =
                rowsThalesAparelho[0]["data_modificacao"];
              ativacao.thales_plano = rowsThalesAparelho[0]["plano"];
              ativacao.thales_id_pacote = rowsThalesAparelho[0]["id_pacote"];
              ativacao.thales_operacao = rowsThalesAparelho[0]["operacao"];
            } else {
              ativacao.thales_status_aparelho = "Não enviado";
            }
          }

          if (hasServico) {
            var filtra_modalidade = "";
            var rowsThalesServico = [];

            if (modalidade?.includes("portab")) {
              gsm = gsmProvisorio;
            }

            if (
              modalidade &&
              (modalidade.includes("ativa") ||
                modalidade.includes("migra") ||
                modalidade.includes("porta") ||
                modalidade.includes("upgr"))
            ) {
              // Localizar modalidade restrita:
              if (
                modalidade &&
                (modalidade.includes("ativa") || modalidade.includes("porta"))
              ) {
                filtra_modalidade = ` and (operacao LIKE '%ativação%'
                                or operacao LIKE '%ativ_cont%'
                                or operacao LIKE '%ativ_pos%'
                                )`;
              }

              if (
                modalidade &&
                (modalidade.includes("migra") || modalidade.includes("upgr"))
              ) {
                filtra_modalidade = ` and (
                                operacao LIKE '%troca de plano%'
                                or operacao LIKE '%pre_cont%'
                                or operacao LIKE'%pre_pos%'
                                or operacao LIKE'%trc_plano%')`;
              }

              // Busca mais restrita (gsm, cpf, liberado e modalidade restrita):
              [rowsThalesServico] = await conn.execute(
                `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao FROM  ${tim_thales}
                            WHERE DATE(data_criacao) >= DATE_SUB(DATE_FORMAT(?, '%Y-%m-01'), INTERVAL 10 DAY) and (gsm = ? or gsm = ?) ${filtra_modalidade} and (cpf_cliente = ? OR cnpj_cliente = ?) and status = 'green'
                            ORDER BY id_pacote DESC LIMIT 1;`,
                [ativacao.dtAtivacao, gsm, gsmProvisorio, ativacao.cpf, ativacao.cpf]
              );

              // Não localizado:
              if (rowsThalesServico.length === 0) {
                // Inclui todas as modalidades e pontuar o hashtag #modalidade
                if (
                  modalidade &&
                  (modalidade.includes("ativa") ||
                    modalidade.includes("migra") ||
                    modalidade.includes("porta") ||
                    modalidade.includes("upgr"))
                ) {
                  filtra_modalidade = ` and (operacao LIKE '%ativação%'
                                    or operacao LIKE '%troca de plano%'
                                    or operacao LIKE '%pre_cont%'
                                    or operacao LIKE'%pre_pos%'
                                    or operacao LIKE '%ativ_cont%'
                                    or operacao LIKE '%ativ_pos%'
                                    or operacao LIKE'%trc_plano%')`;
                }
                // Buscar expandindo as modalidades (gsm, cpf, modalidade abrangente, status liberado):
                [rowsThalesServico] = await conn.execute(
                  `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao FROM  ${tim_thales}
                                WHERE DATE(data_criacao) >= DATE_SUB(DATE_FORMAT(?, '%Y-%m-01'), INTERVAL 10 DAY) and (gsm = ? or gsm = ?) ${filtra_modalidade} and  (cpf_cliente = ? OR cnpj_cliente = ?) and status = 'green'
                                ORDER BY id_pacote DESC LIMIT 1;`,
                  [ativacao.dtAtivacao, gsm, gsmProvisorio, ativacao.cpf, ativacao.cpf]
                );
              }

              // Não localizado - vamos buscar restritamente por outros status:
              if (rowsThalesServico.length === 0) {
                if (
                  modalidade &&
                  (modalidade.includes("ativa") || modalidade.includes("porta"))
                ) {
                  filtra_modalidade = ` and (operacao LIKE '%ativação%'
                                    or operacao LIKE '%ativ_cont%'
                                    or operacao LIKE '%ativ_pos%'
                                    )`;
                }

                if (
                  modalidade &&
                  (modalidade.includes("migra") || modalidade.includes("upgr"))
                ) {
                  filtra_modalidade = ` and (
                                    operacao LIKE '%troca de plano%'
                                    or operacao LIKE '%pre_cont%'
                                    or operacao LIKE'%pre_pos%'
                                    or operacao LIKE'%trc_plano%')`;
                }

                // Buscar modalidade restrita e outros status (gsm, cpf, modalidade restrita):
                [rowsThalesServico] = await conn.execute(
                  `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao FROM  ${tim_thales}
                                WHERE DATE(data_criacao) >= DATE_SUB(DATE_FORMAT(?, '%Y-%m-01'), INTERVAL 10 DAY) and (gsm = ? or gsm = ?) ${filtra_modalidade} and  (cpf_cliente = ? OR cnpj_cliente = ?) 
                                ORDER BY id_pacote DESC LIMIT 1;`,
                  [ativacao.dtAtivacao, gsm, gsmProvisorio, ativacao.cpf, ativacao.cpf]
                );
              }

              if (rowsThalesServico.length === 0) {
                // Inclui todas as modalidades e pontuar o hashtag #modalidade
                if (
                  modalidade &&
                  (modalidade.includes("ativa") ||
                    modalidade.includes("migra") ||
                    modalidade.includes("porta") ||
                    modalidade.includes("upgr"))
                ) {
                  filtra_modalidade = ` and (operacao LIKE '%ativação%'
                                or operacao LIKE '%troca de plano%'
                                or operacao LIKE '%pre_cont%'
                                or operacao LIKE'%pre_pos%'
                                or operacao LIKE '%ativ_cont%'
                                or operacao LIKE '%ativ_pos%'
                                or operacao LIKE'%trc_plano%')`;
                }
                // Buscar por outras modalidades e outros status (gsm, cpf, modalidade abrangente):
                [rowsThalesServico] = await conn.execute(
                  `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao FROM  ${tim_thales}
                            WHERE DATE(data_criacao) >= DATE_SUB(DATE_FORMAT(?, '%Y-%m-01'), INTERVAL 10 DAY) and (gsm = ? or gsm = ?) ${filtra_modalidade} and (cpf_cliente = ? OR cnpj_cliente = ?) 
                            ORDER BY id_pacote DESC LIMIT 1;`,
                  [ativacao.dtAtivacao, gsm, gsmProvisorio, ativacao.cpf, ativacao.cpf]
                );
              }
            } //fim da verificação restrita de modalidade [ativ, migr, port, upgr]

            // Não localizei pacote liberado para esse caso, então vamos buscar outros pacotes
            // Porém, retirando trc_chip
            if (rowsThalesServico.length === 0) {
              [rowsThalesServico] = await conn.execute(
                `SELECT gsm, cpf_cliente, cnpj_cliente, status, historico, fidelizacao, data_criacao, data_modificacao, plano, id_pacote, operacao FROM  ${tim_thales}
                            WHERE DATE(data_criacao) >= DATE_SUB(DATE_FORMAT(?, '%Y-%m-01'), INTERVAL 10 DAY) and (gsm = ? or gsm = ?) and  (cpf_cliente = ? OR cnpj_cliente = ?) and not operacao like 'trc_chip' and not operacao like 'fid_base'
                            ORDER BY id_pacote DESC LIMIT 1;`,
                [ativacao.dtAtivacao, gsm, gsmProvisorio, ativacao.cpf, ativacao.cpf]
              );
            }

            if (rowsThalesServico.length > 0) {
              // Análise de divergências
              if (isPortab) {
                if (rowsThalesServico[0]["gsm"] != ativacao.gsmProvisorio) {
                  hashtags += " #gsmProv";
                  hasHashtagServico = true;
                }
              } else {
                if (rowsThalesServico[0]["gsm"] != gsm) {
                  hashtags += " #gsm";
                  hasHashtagServico = true;
                }
              }

              if (!!rowsThalesServico[0]["cnpj_cliente"] && ativacao.cpf !== rowsThalesServico[0]["cnpj_cliente"]) {
                hashtags += '#cnpj'
                hasHashtagServico = true
              }

              if (!rowsThalesServico[0]["cnpj_cliente"] && ativacao.cpf !== rowsThalesServico[0]["cpf_cliente"]) {
                // console.log(ativacao.cpf, rowsThalesServico[0]['cpf_cliente'])
                hashtags += " #cpf";
                hasHashtagServico = true;
              }


              // Análise de fidelização de plano apenas para o que não for pelo app
              if (
                !hasAparelho &&
                !plaOpera.includes('depen') &&
                ativacao.fidPlano?.toLowerCase() === "sim" &&
                !rowsThalesServico[0]["operacao"]
                  ?.toLowerCase()
                  .includes("+ plano") &&
                !rowsThalesServico[0]["operacao"]
                  ?.toLowerCase()
                  .includes("fidelidade de plano") &&
                rowsThalesServico[0]["operacao"]?.toLowerCase().includes("pf n")
              ) {
                const fids = rowsThalesServico[0]["fidelizacao"]?.split("");
                if (!fids || fids[2] == "0") {
                  hashtags += " #fidPlano";
                  hasHashtagServico = true;
                }
              }

              // Análise de modalidade (Ativação/Portabilidade):
              if (
                modalidade &&
                (modalidade.includes("ativa") || modalidade.includes("porta"))
              ) {
                let operacao =
                  rowsThalesServico &&
                  rowsThalesServico[0] &&
                  rowsThalesServico[0]["operacao"]?.toLowerCase();

                if (
                  !operacao?.includes("ativação") &&
                  !operacao?.includes("ativ_cont") &&
                  !operacao?.includes("ativ_pos")
                ) {
                  hashtags += " #modalidade";
                  hasHashtagServico = true;
                }
              }
              // Análise de modalidade (Migração/Upgrade):
              if (
                modalidade.length &&
                (modalidade.includes("migra") || modalidade.includes("upgr"))
              ) {
                let operacao =
                  rowsThalesServico &&
                  rowsThalesServico[0] &&
                  rowsThalesServico[0]["operacao"]?.toLowerCase();

                // A primeira linha remove o que no Datasys é MIGRA + TC e que subiu no Thales como Ativ_...
                if (
                  (!(/migra.*\+ tc/.test(plaOpera)) && (!operacao || !operacao.includes('ativ_'))) &&
                  !operacao?.includes("troca de plano") &&
                  !operacao?.includes("pre_pos") &&
                  !operacao?.includes("pre_cont") &&
                  !operacao?.includes("trc_plano")
                ) {
                  hashtags += " #modalidade";
                  hasHashtagServico = true;
                }
              }

              let statusServico = converteStatusThales(rowsThalesServico[0]["status"]);
              ativacao.thales_status_servico = `${statusServico}${hasHashtagServico === true && statusServico !== 'Não enviado' ? " #" : ""}`;

              ativacao.thales_historico = rowsThalesServico[0]["historico"];
              ativacao.thales_fidelizacao = rowsThalesServico[0]["fidelizacao"];
              ativacao.thales_data_criacao =
                rowsThalesServico[0]["data_criacao"];
              ativacao.thales_data_modificacao =
                rowsThalesServico[0]["data_modificacao"];
              ativacao.thales_plano = rowsThalesServico[0]["plano"];
              ativacao.thales_id_pacote = rowsThalesServico[0]["id_pacote"];
              ativacao.thales_operacao = rowsThalesServico[0]["operacao"];
            } else {
              ativacao.thales_status_servico = "Não enviado";
            }
          }

          if (hasServico && !hasAparelho) {
            if (statusLinha === 'cancelada') {
              ativacao.thales_status = 'Liberado sem envio'
            } else {
              ativacao.thales_status = ativacao.thales_status_servico;
            }
          }
          if (hasAparelho && !hasServico) {
            ativacao.thales_status = ativacao.thales_status_aparelho;
          }
          if (hasAparelho && hasServico) {

            if (ativacao.thales_status_aparelho !== "Liberado") {
              ativacao.thales_status = ativacao.thales_status_aparelho;
            } else {
              ativacao.thales_status = ativacao.thales_status_servico;
            }
          }
          // ! Libera sem envio todas as docs com statusLinha = 'CANCELADA'
          if (statusLinha === 'cancelada') {
            ativacao.thales_status = 'Liberado sem envio'
          }
          ativacao.hashtags = hashtags || null;
        }

        docs.push(ativacao);
      }

      const values = [];
      for (let d = 0; d < docs.length; d++) {
        const doc = docs[d];
        let ativacao_id = db.escape(doc["ativacao_id"]) || null;
        let thales_status = db.escape(doc["thales_status"]) || null;
        let thales_status_servico =
          db.escape(doc["thales_status_servico"]) || null;
        let thales_status_aparelho =
          db.escape(doc["thales_status_aparelho"]) || null;
        let hashtags = db.escape(doc["hashtags"]) || null;
        let thales_operacao =
          db.escape(doc["thales_operacao"]?.substring(0, 150)) || null;
        let statusLinha = db.escape(doc["statusLinha"]) || null;
        let gsm = db.escape(doc["gsm"]) || null;
        let gsmProvisorio = db.escape(doc["gsmProvisorio"]) || null;
        let imei = db.escape(doc["imei"]) || null;
        let pedido = db.escape(doc["pedido"]) || null;
        let filial = db.escape(doc["filial"]) || null;
        let grupo_economico = db.escape(doc["grupo_economico"]);
        let modalidade = db.escape(doc["modalidade"]) || null;
        let plaOpera = db.escape(doc["plaOpera"]) || null;
        let thales_plano = db.escape(doc["thales_plano"]) || null;
        let vendedor = db.escape(doc["vendedor"]) || null;
        let cpfVendedor = db.escape(doc["cpfVendedor"]) || null;
        let cpf_cliente = db.escape(doc["cpf"]) || null;
        let cliente = db.escape(doc["cliente"]) || null;
        let fidAparelho = db.escape(doc["fidAparelho"]) || null;
        let fidPlano = db.escape(doc["fidPlano"]) || null;
        let thales_fidelizacao = db.escape(doc["thales_fidelizacao"]) || null;
        let thales_condicao_pgto =
          db.escape(doc["thales_condicao_pgto"]) || null;
        let aparelho = db.escape(doc["aparelho"]) || null;
        let thales_data_criacao = db.escape(doc["thales_data_criacao"]) || null;
        let thales_data_modificacao =
          db.escape(doc["thales_data_modificacao"]) || null;
        let dtAtivacao = db.escape(doc["dtAtivacao"]) || null;
        let thales_historico = db.escape(doc["thales_historico"]) || null;

        let value = `
                (${ativacao_id}, ${thales_status}, ${thales_status_servico}, ${thales_status_aparelho}, ${hashtags}, ${thales_operacao}, ${statusLinha},  ${gsm}, ${gsmProvisorio}, ${imei}, ${pedido}, ${grupo_economico}, ${filial}, ${modalidade}, ${plaOpera}, ${thales_plano}, ${vendedor}, ${cpfVendedor}, ${cpf_cliente}, ${cliente}, ${fidAparelho}, ${fidPlano}, ${thales_fidelizacao}, ${thales_condicao_pgto}, ${aparelho}, ${thales_data_criacao}, ${thales_data_modificacao}, ${dtAtivacao}, ${thales_historico})`;

        values.push(value);
      }

      if (values.length > 0) {
        // console.log("Values gerados, agora vamos importar!");
        // Inserir na facell_docs

        await conn.execute(`INSERT INTO ${facell_docs} (
            ativacao_id,
            thales_status,
            thales_status_servico,
            thales_status_aparelho,
            hashtags,
            thales_operacao,
            statusLinha,
            gsm,
            gsmProvisorio,
            imei,
            pedido,
            grupo_economico,
            filial,
            modalidade,
            plaOpera,
            thales_plano,
            vendedor,
            cpfVendedor,
            cpf_cliente,
            cliente,
            fidAparelho,
            fidPlano,
            thales_fidelizacao,
            thales_condicao_pgto,
            aparelho,
            thales_data_criacao,
            thales_data_modificacao,
            dtAtivacao,
            thales_historico
      
            ) VALUES ${values.join(',')}
            
            ON DUPLICATE KEY UPDATE
            cpf_cliente = VALUES(cpf_cliente),
            gsmProvisorio = VALUES(gsmProvisorio),
            gsm = VALUES(gsm),
            hashtags = VALUES(hashtags),
            modalidade = VALUES(modalidade),
            statusLinha = VALUES(statusLinha),
            thales_status = VALUES(thales_status),
            thales_status_servico = VALUES(thales_status_servico),
            thales_status_aparelho = VALUES(thales_status_aparelho),
            thales_operacao = VALUES(thales_operacao),
            thales_fidelizacao = VALUES(thales_fidelizacao),
            thales_condicao_pgto = VALUES(thales_condicao_pgto),
            thales_data_criacao = VALUES(thales_data_criacao),
            thales_data_modificacao = VALUES(thales_data_modificacao),
            thales_historico = VALUES(thales_historico),
            fidAparelho = VALUES(fidAparelho),
            fidPlano = VALUES(fidPlano),
            vendedor = VALUES(vendedor)

            ;`);
      }

      console.log(`[PROCESSAR_DOCS]: Processamento concluído: ${grupo_economico} ${dataInicial} - ${dataFinal}`);
      resolve("Ok");
    } catch (error) {
      console.log(error);
      reject(error);
      return false;
    }
  });
}

// Configurações do robô
function listarCredenciais({ grupo_economico }) {
  return new Promise(async (resolve, reject) => {

    try {
      const [credenciais] = await db.execute("SELECT token, senha FROM tim_logins WHERE grupo_economico = ?", [grupo_economico])

      resolve(credenciais)
      return true;
    } catch (error) {
      reject(error)
      return false;
    }
  })
}

function editarCredenciais({ grupo_economico, token, senha }) {
  return new Promise(async (resolve, reject) => {

    try {
      await db.execute("UPDATE tim_logins SET token = ?, senha = ? WHERE grupo_economico = ?", [token, senha, grupo_economico])

      resolve()
      return true;
    } catch (error) {
      reject(error)
      return false;
    }
  })
}

module.exports = {
  importarPacotesThales,
  listarDocs,
  processarDocs,
  thalesCharts,
  listarCredenciais,
  editarCredenciais,
  exportarLinhas,
};
