const { db } = require("../../../../mysql");
const csv = require("csv-parser");
const { logger } = require("../../../../logger");
const {formatDate} = require('date-fns')

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

// INADIMPLÊNCIA
const processarClienteInadimplencia = ({ conn_externa, cliente, data_inicial, data_final, grupo_economico }) => {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      const {
        status_inadimplencia,
        sgr_fat1_vencimento,
        sgr_fat1_valor,
        sgr_fat2_vencimento,
        sgr_fat2_valor,
        cod_cliente
      } = cliente;
      const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

      conn = conn_externa || (await db.getConnection())
      conn.config.namedPlaceholders = true;

      await conn.execute(
        `UPDATE ${facell_docs}
            SET status_inadimplencia = :status_inadimplencia, 
            sgr_fat1_vencimento = :sgr_fat1_vencimento, 
            sgr_fat1_valor = :sgr_fat1_valor, 
            sgr_fat2_vencimento = :sgr_fat2_vencimento, 
            sgr_fat2_valor = :sgr_fat2_valor
          WHERE 
            dtAtivacao BETWEEN :data_inicial AND :data_final 
            and cod_cliente = :cod_cliente 
            and inadim_alterado_manual = false;`,
        {
          cod_cliente,
          status_inadimplencia,
          sgr_fat1_vencimento: sgr_fat1_vencimento ? formatDate(sgr_fat1_vencimento , 'yyyy-MM-dd') : null,
          sgr_fat1_valor: transformarNumeroBRparaFloat(sgr_fat1_valor) || null,
          sgr_fat2_valor: transformarNumeroBRparaFloat(sgr_fat2_valor) || null,
          sgr_fat2_vencimento: sgr_fat2_vencimento ? formatDate(sgr_fat2_vencimento , 'yyyy-MM-dd') : null,
          data_inicial,
          data_final,
        }
      );

      resolve(cliente)
    } catch (error) {
      reject(error)
    } finally {
      if (conn && !conn_externa) conn.release();
    }
  })
}

exports.updateClienteInadimplencia = async (req, res) => {
  try {
    const {
      cliente,
      data_inicial,
      data_final,
      grupo_economico,
    } = req.body || {};

    if (!cliente) throw new Error('Cliente não recebido!')
    const {
      cod_cliente,
      status,
      fat1_datavenc,
      fat1_valor,
      fat2_datavenc,
      fat2_valor,

    } = cliente;
    if (!(cod_cliente && status)) {
      throw new Error('Código do cliente ou status não recebidos!')
    }
    await processarClienteInadimplencia({
      cliente: {
        cod_cliente,
        status_inadimplencia: status,
        sgr_fat1_vencimento: fat1_datavenc || null,
        sgr_fat1_valor: fat1_valor || null,
        sgr_fat2_vencimento: fat2_datavenc || null,
        sgr_fat2_valor: fat2_valor || null,
      },
      data_inicial,
      data_final,
      grupo_economico
    })

    res.status(200).json({ message: 'Sucesso!' })
  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'UPDATE_CLIENTE_INADIMPLENCIA',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {

  }
}

exports.getClientesInadimplencia = async (req, res) => {
  let conn;
  try {
    // console.log(req.query);

    const { data_inicial, data_final, grupo_economico, incluir_adimplentes } = req.query;
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
    AND cod_cliente IS NOT NULL 
    AND cod_cliente != ''
    AND modalidade NOT LIKE '%PRÉ%' 
    AND modalidade NOT LIKE '%TROCA DE%' 
    AND modalidade NOT LIKE '%UPGRADE%' 
    AND modalidade NOT LIKE '%ATIVAÇÃO LIVE TIM%' 
    AND modalidade NOT LIKE '%C6 BANK%' 
    AND plaOpera NOT LIKE '%DEPENDENTE%' 
    AND plaOpera NOT LIKE '%EXPRESS%' 
    AND dtAtivacao BETWEEN ? AND ? `
    params.push(formatDate(data_inicial, 'yyyy-MM-dd'))
    params.push(formatDate(data_final, 'yyyy-MM-dd'))

    if (!(incluir_adimplentes == 1 || incluir_adimplentes == 'true')) {
      where += ` AND status_inadimplencia != 'Adimplente' `
    }

    let query = `SELECT DISTINCT cod_cliente FROM ${facell_docs} ${where}`;
    // console.log(query)
    // console.log(params)

    const [rows] = await conn.execute(query, params)
    
    const clientes = rows && rows.map(row => row.cod_cliente) || []
    res.status(200).json({ clientes, qtde: clientes.length })
  } catch (error) {
    logger.error({
      module: 'QUALIDADE', origin: 'ESTEIRA', method: 'GET_CLIENTES_INADIMPLENCIA',
      data: { name: error.name, stack: error.stack, message: error.message }
    })
    res.status(400).json({ message: error.message })
  } finally {
    if (conn) conn.release();
  }
}

exports.importarArquivoSGR = async (req, res) => {
  let conn;
  try {
    const { anoMes, grupo_economico } = req.body;
    const buffer = req?.file?.buffer;

    if (!buffer) throw new Error("Arquivo não recebido!");
    if (!grupo_economico) throw new Error('[IMPORTAR_SGR]: Grupo não informado!');
    if (!anoMes) throw new Error("Ano/Mes não informado!");

    conn = await db.getConnection();

    const dataInicialMes = parse(anoMes + '-01');
    const dataFinalMes = endOfMonth(dataInicialMes);

    await new Promise(async (resolve, reject) => {
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

              await processarClienteInadimplencia({
                cliente: {
                  conn_externa: conn,
                  cod_cliente,
                  status_inadimplencia,
                  sgr_fat1_vencimento,
                  sgr_fat1_valor,
                  sgr_fat2_vencimento,
                  sgr_fat2_valor,
                },
                grupo_economico,
                data_inicial: dataInicialMes,
                data_final: dataFinalMes,
              })
            }
            await conn.commit();
            return resolve(true);
          } catch (error) {
            await conn.rollback();
            reject(error);
          } finally {
            if (conn) conn.release();
          }
        })
        .on("error", (error) => {
          reject(error);
        });
    })

    res.status(200).json({ message: 'Sucesso!' })
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
}

exports.getInadimplencias = async (req, res) => {
  let conn;
  try {
    const {
      anoMes,
      filial,
      grupo_economico
    } = req.body || {};

    if (!grupo_economico) throw new Error('Grupo não informado!');
    
    conn = await db.getConnection();
    const facell_docs = grupo_economico === 'FACELL' ? 'facell_docs' : 'facell_docs_fort';

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
      [inadimplencias] = await conn.execute(query, [anoMes, filial]);
    } else {
      [inadimplencias] = await conn.execute(query, [anoMes]);
    }

    res.status(200).json({ message: 'Sucesso!', rows: inadimplencias });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (conn) conn.release();
  }
}