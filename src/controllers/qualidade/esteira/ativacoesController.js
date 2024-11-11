"use strict";
const { db } = require("../../../../mysql");
const csv = require("csv-parser");
const { parse, endOfMonth, formatDate } = require("date-fns");
const stream = require("stream");
const { logger } = require("../../../../logger");

/**
 * Realiza o processamento sobre ativação/fidelização de cliente CBCF
 */
const processarClienteCBCF = ({ conn_externa, cliente, data_inicial, data_final, grupo_economico }) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = conn_externa || (await db.getConnection());
      conn.config.namedPlaceholders = true;

      const dataInicial = formatDate(data_inicial, 'yyyy-MM-dd')
      const dataFinal = formatDate(data_final, 'yyyy-MM-dd')

      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
      let {
        gsm,
        status_ativacao,
        cod_cliente,
        plano_ativado,
      } = cliente;

      var data_fid_aparelho = null;
      var data_fid_plano = null;

      // Passagem pelas fidelizações
      for (let f = 1; f < 3; f++) {
        const motivo = cliente[`fid${f}_motivo`] || null;
        var data_criacao = cliente[`fid${f}_criacao`] || null;
        if (data_criacao && data_criacao !== "") {
          data_criacao = data_criacao.split("/").reverse().join("-");
        }

        if (!motivo || motivo == "") {
          continue;
        }
        if (motivo.toLowerCase().includes("aparelho")) {
          data_fid_aparelho = data_criacao;
        } else {
          data_fid_plano = data_criacao;
        }
      }

      // Inicio da análise de fid de aparelho
      const [rowsAparelho] = await conn.execute(`SELECT d.id, plaOpera, DATE_FORMAT(dtAtivacao, '%Y-%m-%d') AS dtAtivacao, p.deve_ter, p.nao_deve_ter 
        FROM ${facell_docs} d
        LEFT JOIN datasys_planos_fid_aparelho p ON p.plano_datasys = d.plaOpera
        WHERE 
          fidAparelho = 'SIM' 
          AND NOT imei IS NULL 
          AND dtAtivacao BETWEEN :dataInicial AND :dataFinal
          AND (gsm = :gsm OR gsmProvisorio = :gsm) LIMIT 1`, { gsm, dataInicial, dataFinal })

      const docAparelho = rowsAparelho && rowsAparelho[0]
      var status_fid_aparelho = 'Não fidelizado'


      if (data_fid_aparelho && docAparelho) {
        const dateFid = new Date(data_fid_aparelho + ' 00:00:00')
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
      const params = {
        status_ativacao,
        plano_ativado: plano_ativado || null,
        cod_cliente: cod_cliente || null,
        data_fid_plano: data_fid_plano || null,
        data_fid_aparelho: data_fid_aparelho || null,
        status_fid_aparelho,
        data_inicial,
        data_final,
        gsm,
      }
      // console.log(params);

      await conn.execute(
        `UPDATE ${facell_docs} 
            SET 
                status_ativacao = :status_ativacao,
                plano_ativado = :plano_ativado,
                cod_cliente = :cod_cliente,
                data_fid_plano = :data_fid_plano,
                data_fid_aparelho = :data_fid_aparelho,
                status_fid_aparelho = :status_fid_aparelho
            WHERE 
            dtAtivacao BETWEEN :data_inicial AND :data_final 
            AND (gsm = :gsm OR gsmProvisorio = :gsm)`,
        params
      );

      resolve(cliente)
    } catch (error) {
      logger.error({
        module: 'QUALIDADE', origin: 'ESTEIRA', method: 'PROCESSAR_CLIENTE_CBCF',
        data: { name: error.name, stack: error.stack, message: error.message }
      })
      reject(error)
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  })
}

const processarClienteExpress = ({ conn_externa, cliente, data_inicial, data_final, grupo_economico }) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = conn_externa || (await db.getConnection());
      conn.config.namedPlaceholders = true;

      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
      let {
        gsm,
        status_ativacao,
        plano_ativado,
      } = cliente;

      // fim da análise da fid aparelho
      const params = {
        status_ativacao,
        plano_ativado: plano_ativado || null,
        data_inicial,
        data_final,
        gsm
      }

      // console.log(params);
      await conn.execute(
        `UPDATE ${facell_docs} 
            SET 
              status_ativacao = :status_ativacao, 
              plano_ativado = :plano_ativado 
          WHERE 
            dtAtivacao BETWEEN :data_inicial AND :data_final 
            AND (gsm = :gsm OR gsmProvisorio = :gsm) ;`,
        params
      );

      resolve(cliente)
    } catch (error) {
      logger.error({
        module: 'QUALIDADE', origin: 'ESTEIRA', method: 'PROCESSAR_CLIENTE_EXPRESS',
        data: { name: error.name, stack: error.stack, message: error.message }
      })
      reject(error)
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  })
}

exports.updateClienteCBCF = async (req, res) => {
  try {
    const {
      cliente,
      data_inicial,
      data_final,
      grupo_economico,
    } = req.body || {};

    if (!cliente) throw new Error('Cliente não recebido!')
    const {
      gsm,
      cod_cliente,
      status_ativacao,
      plano_ativado,
      fid1_motivo,
      fid2_motivo,
      fid3_motivo,
      fid1_criacao,
      fid2_criacao,
      fid3_criacao,
    } = cliente;

    if (!gsm){
      throw new Error('GSM não informado!')
    } 
    if(!status_ativacao){
      throw new Error('status_ativacao não informada!')
    }
    
      await processarClienteCBCF({
        cliente: {
          gsm,
          status_ativacao,
          cod_cliente,
          plano_ativado,
          fid1_motivo,
          fid2_motivo,
          fid3_motivo,
          fid1_criacao,
          fid2_criacao,
          fid3_criacao,
        },
        data_inicial,
        data_final,
        grupo_economico
      })

    res.status(200).json({ message: 'Sucesso!' })
  } catch (error) {

    res.status(400).json({ message: error.message })
  } finally {

  }
}

exports.updateClienteExpress = async (req, res) => {
  console.log('Update cliente express')
  try {
    const {
      cliente,
      data_inicial,
      data_final,
      grupo_economico,
    } = req.body || {};

    if (!cliente) throw new Error('Cliente não recebido!')
    const {
      gsm,
      status_plano,
      status_ativacao,
      plano_ativado,
    } = cliente;
    if (!(gsm && status_plano && status_ativacao))

      await processarClienteExpress({
        cliente: {
          gsm,
          status_ativacao,
          plano_ativado,
        },
        data_inicial,
        data_final,
        grupo_economico
      })

    res.status(200).json({ message: 'Sucesso!' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.importarArquivoCBCF = async (req, res) => {
  try {
    const { anoMes, grupo_economico } = req.body;
    const buffer = req.file.buffer;

    if (!grupo_economico) {
      throw new Error('Grupo não informado!')
    }

    const dataInicialMes = parse(anoMes + '-01');
    const dataFinalMes = endOfMonth(dataInicialMes);

    // Converta o buffer de Windows-1252 para UTF-8 usando iconv-lite.
    // const utf8String = iconv.decode(buffer, "win1252");

    const results = [];
    // const readableStream = require("stream").Readable.from(utf8String);
    await new Promise(async (resolve, reject) => {
      const readableStream = stream.Readable.from(buffer);
      readableStream
        .pipe(csv({ separator: "," }))
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", async () => {
          try {
            var conn = await db.getConnection();
            await conn.beginTransaction();

            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              // console.log(row)

              await processarClienteCBCF({
                cliente: {
                  gsm: row["gsm"],
                  status_ativacao: row["status"],
                  cod_cliente: row["codCliente"],
                  plano_ativado: row["planoTarifario"],
                  fid1_motivo: row["fid1_motivo"],
                  fid2_motivo: row["fid2_motivo"],
                  fid3_motivo: row["fid3_motivo"],
                  fid1_criacao: row["fid1_criacao"],
                  fid2_criacao: row["fid2_criacao"],
                  fid3_criacao: row["fid3_criacao"],
                },
                data_inicial: dataInicialMes,
                data_final: dataFinalMes,
                grupo_economico
              })
            }

            await conn.commit();
          } catch (error) {
            await conn.rollback();
            reject(error);
          } finally {
            if (conn) conn.release();
          }
          return resolve(true);
        })
        .on("error", (error) => {
          console.log(error);
          return reject(error);;
        });
    })

    res.status(200).json({ qtde: results.length })

  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'IMPORTAR_ARQUIVO_CBCF',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  }
}

exports.importarArquivoExpress = async (req, res) => {
  try {
    const { anoMes, grupo_economico } = req.body;
    const buffer = req.file.buffer;

    if (!grupo_economico) {
      throw new Error('Grupo não informado!')
    }

    const dataInicialMes = parse(anoMes + '-01');
    const dataFinalMes = endOfMonth(dataInicialMes);

    // Converta o buffer de Windows-1252 para UTF-8 usando iconv-lite.
    // const utf8String = iconv.decode(buffer, "win1252");

    const results = [];
    // const readableStream = require("stream").Readable.from(utf8String);
    await new Promise(async (resolve, reject) => {
      const readableStream = stream.Readable.from(buffer);
      readableStream
        .pipe(csv({ separator: "," }))
        .on("data", (row) => {
          results.push(row);
        })
        .on("end", async () => {
          try {
            var conn = await db.getConnection();
            await conn.beginTransaction();

            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              // console.log(row)

              await processarClienteExpress({
                cliente: {
                  gsm: row["gsm"],
                  status_ativacao: row["status"],
                  cod_cliente: row["codCliente"],
                  plano_ativado: row["planoTarifario"],
                },
                data_inicial: dataInicialMes,
                data_final: dataFinalMes,
                grupo_economico
              })
            }

            await conn.commit();
          } catch (error) {
            await conn.rollback();
            reject(error);
          } finally {
            if (conn) conn.release();
          }
          return resolve(true);
        })
        .on("error", (error) => {
          console.log(error);
          return reject(error);;
        });
    })

    res.status(200).json({ qtde: results.length })

  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'IMPORTAR_ARQUIVO_EXPRESS',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  }
}

exports.getGSMClientesCBCF = async (req, res) => {
  let conn;
  try {
    // console.log(req.query);
    const { data_inicial, data_final, grupo_economico, incluir_ativos } = req.query;
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
    AND plaOpera NOT LIKE '%EXPRESS%'
    AND modalidade NOT LIKE '%PRÉ-PAGO%' 
    AND modalidade NOT LIKE '%TROCA DE%' 
    AND modalidade NOT LIKE '%Alteração Cadastral%' 
    AND modalidade NOT LIKE 'Criação de Protocolo'
    AND modalidade NOT LIKE 'UPGRADE PÓS-PÓS'
    AND modalidade NOT LIKE 'ATIVAÇÃO LIVE TIM'
    AND modalidade NOT LIKE '%Segunda via de Conta%' 
    AND modalidade NOT LIKE '%DEBITO%'
    AND modalidade NOT LIKE '%Reagendamento%'
    AND modalidade NOT LIKE 'Transferencia de Titularidade' 
    AND dtAtivacao BETWEEN ? AND ? `
    params.push(formatDate(data_inicial, 'yyyy-MM-dd'))
    params.push(formatDate(data_final, 'yyyy-MM-dd'))

    if (!(incluir_ativos == 1 || incluir_ativos == 'true')) {
      where += ` AND status_ativacao != 'Ativo' `
    }

    let query = `SELECT DISTINCT 
    CASE WHEN DATEDIFF(CURDATE(), dtAtivacao) < 4 and modalidade LIKE 'PORT%' THEN gsmProvisorio ELSE gsm END as gsm
    FROM ${facell_docs} ${where}`;
    // console.log(query)
    // console.log(params)

    const [rows] = await conn.execute(query, params)
    const gsms = rows && rows.map(row => row.gsm) || []
    res.status(200).json({ gsms, qtde: gsms.length })
  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'GET_GSMS_CBCF',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}

exports.getGSMClientesExpress = async (req, res) => {
  let conn;
  try {
    const { data_inicial, data_final, grupo_economico, incluir_ativos } = req.query;

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
    AND plaOpera LIKE '%EXPRESS%'
    AND modalidade NOT LIKE '%PRÉ-PAGO%' 
    AND modalidade NOT LIKE '%TROCA DE%' 
    AND modalidade NOT LIKE '%Alteração Cadastral%' 
    AND modalidade NOT LIKE 'Criação de Protocolo'
    AND modalidade NOT LIKE 'UPGRADE PÓS-PÓS'
    AND modalidade NOT LIKE 'ATIVAÇÃO LIVE TIM'
    AND modalidade NOT LIKE '%Segunda via de Conta%' 
    AND modalidade NOT LIKE '%DEBITO%'
    AND modalidade NOT LIKE '%Reagendamento%'
    AND modalidade NOT LIKE 'Transferencia de Titularidade' 
    AND dtAtivacao BETWEEN ? AND ? `
    params.push(formatDate(data_inicial, 'yyyy-MM-dd'))
    params.push(formatDate(data_final, 'yyyy-MM-dd'))

    if (!(incluir_ativos == 1 || incluir_ativos == 'true')) {
      where += ` AND status_ativacao != 'Ativo' `
    }
    let query = `SELECT DISTINCT 
    CASE WHEN DATEDIFF(CURDATE(), dtAtivacao) < 4 and modalidade LIKE 'PORT%' THEN gsmProvisorio ELSE gsm END as gsm
    FROM ${facell_docs} ${where}`;
    // console.log(query)
    // console.log(params)

    const [rows] = await conn.execute(query, params)
    const gsms = rows && rows.map(row => row['gsm']) || []
    res.status(200).json({ qtde: gsms.length, gsms })
  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'GET_GSMS_EXPRESS',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}

exports.getAtivacoes = async (req, res) => {
  let conn;
  try {
    const {
      anoMes,
      filial,
      grupo_economico
    } = req.body || {};

    if (!grupo_economico) {
      throw new Error('Grupo não informado!')
    }
    conn = await db.getConnection();
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

    var ativacoes = [];
    if (filial) {
      [ativacoes] = await conn.execute(
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
      [ativacoes] = await conn.execute(
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

    res.status(200).json({ message: 'Sucesso!', rows: ativacoes });
  } catch (error) {
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}