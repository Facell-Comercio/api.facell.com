const { db } = require('../../../../mysql')
const xlsx = require('xlsx')

function tratarData(data) {
    if (data == '' || data == null || data == undefined || data == ' ') {
        return null
    }
    novaData = data.substring(0, 10).split('/').reverse().join('-')
    return novaData
}


// Importação do DocCenter
async function importarPortabilidadesSolicitadas_OLD(xlsxFileBuffer) {
    return new Promise(async (resolve, reject) => {

        try {
            const workbook = xlsx.read(xlsxFileBuffer, { type: 'buffer' });
            const primeiraPlanilha = workbook.Sheets[workbook.SheetNames[0]];
            const dadosJSON = xlsx.utils.sheet_to_json(primeiraPlanilha);

            let values = ''
            for (let i = 0; i < dadosJSON.length; i++) {
                const row = dadosJSON[i];

                let ACESSO = db.escape(row['ACESSO'] || null)
                let TEMPORARIO = db.escape(row['TEMPORARIO'] || null)
                let NR_BILHETE = db.escape(row['NR_BILHETE'] || null)
                let DATA_SOLICITACAO = db.escape(tratarData(row['DATA_SOLICITACAO']) || null)
                let DATA_ATIVACAO = db.escape(tratarData(row['DATA_ATIVACAO']) || null)
                let DATA_CANCELAMENTO = db.escape(tratarData(row['DATA_CANCELAMENTO']) || null)
                let DATA_CONCLUSAO = db.escape(tratarData(row['DATA_CONCLUSAO']) || null)
                let STATUS = db.escape(row['STATUS'] || null)
                let STATUS_FINAL = db.escape(row['STATUS_FINAL'] || null)
                let MOTIVO_CONFLITO = db.escape(row['MOTIVO_CONFLITO'] || null)
                let MOTIVO_CANCELAMENTO = db.escape(row['MOTIVO_CANCELAMENTO'] || null)
                let CUSTCODE_SOLICITANTE = db.escape(row['CUSTCODE_SOLICITANTE'] || null)
                let NICKNAME = db.escape(row['NICKNAME'] || null)

                values += `( 
                    ${ACESSO}, ${TEMPORARIO}, ${NR_BILHETE}, ${DATA_SOLICITACAO}, ${DATA_ATIVACAO}, ${DATA_CANCELAMENTO}, ${DATA_CONCLUSAO}, ${STATUS}, ${STATUS_FINAL}, ${MOTIVO_CONFLITO}, ${MOTIVO_CANCELAMENTO}, ${CUSTCODE_SOLICITANTE}, ${NICKNAME}
                    ),`;
            }
            values = values.slice(0, -1)

            var query = ''
            try {
                query = `INSERT INTO tim_portabilidades_solicitadas (
                    ACESSO, TEMPORARIO, NR_BILHETE, DATA_SOLICITACAO, DATA_ATIVACAO, DATA_CANCELAMENTO, DATA_CONCLUSAO, STATUS, STATUS_FINAL, MOTIVO_CONFLITO, MOTIVO_CANCELAMENTO, CUSTCODE_SOLICITANTE, NICKNAME ) VALUES ${values}
                    
                    ON DUPLICATE KEY UPDATE
                    ACESSO = VALUES(ACESSO),
                    TEMPORARIO = VALUES(TEMPORARIO),
                    DATA_SOLICITACAO = VALUES(DATA_SOLICITACAO),
                    DATA_ATIVACAO = VALUES(DATA_ATIVACAO),
                    DATA_CANCELAMENTO = VALUES(DATA_CANCELAMENTO),
                    DATA_CONCLUSAO = VALUES(DATA_CONCLUSAO),
                    STATUS = VALUES(STATUS),
                    STATUS_FINAL = VALUES(STATUS_FINAL),
                    MOTIVO_CONFLITO = VALUES(MOTIVO_CONFLITO),
                    MOTIVO_CANCELAMENTO = VALUES(MOTIVO_CANCELAMENTO),
                    CUSTCODE_SOLICITANTE = VALUES(CUSTCODE_SOLICITANTE),
                    NICKNAME = VALUES(NICKNAME)
                    ;`

                await db.execute(query);

                resolve('Sucesso!')
                return true;
            } catch (error) {
                console.log('Erro ao tentar importar as portabilidades! :' + error)
                reject(error)
            }

        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

async function listarPortabilidadesSolicitadas_OLD(anoMes, filial = null) {
    return new Promise(async (resolve, reject) => {

        var query = `SELECT 
        p.*,
        a.vendedor,
        a.cpf,
        a.cliente,
        pdv.uf,
        pdv.filial
    FROM tim_portabilidades_solicitadas p
    LEFT JOIN tim_pdvs pdv ON pdv.custcode = p.CUSTCODE_SOLICITANTE
    LEFT JOIN (
        SELECT 
            CASE 
                WHEN a.gsm IS NOT NULL THEN a.gsm
                WHEN a.gsmProvisorio IS NOT NULL THEN a.gsmProvisorio
            END AS acesso,
            MAX(a.vendedor) AS vendedor,
            MAX(a.cpf) AS cpf,
            MAX(a.cliente) AS cliente
        FROM datasys_ativacoes a
        GROUP BY 
            CASE 
                WHEN a.gsm IS NOT NULL THEN a.gsm
                WHEN a.gsmProvisorio IS NOT NULL THEN a.gsmProvisorio
            END
    ) a ON a.acesso = p.ACESSO
    WHERE DATE_FORMAT(DATA_SOLICITACAO, '%Y-%m') = ?`

        if (filial) {
            query += ' and filial = ?'
        }

        try {
            var rows = []
            if (filial) {
                [rows] = await db.execute(query, [anoMes, filial]);
            } else {
                [rows] = await db.execute(query, [anoMes]);
            }

            resolve(rows)
            return true;
        } catch (error) {
            console.log(error)
            reject(error)
            return false;
        }
    })
}

async function listarPortabilidadesSolicitadas(body) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const { apenasPendencias, grupo_economico, anoMes, filial = null, vendedor = null } = body;

            // console.log(body);
            const facell_docs = grupo_economico == 'FACELL' ? 'facell_docs' : 'facell_docs_fort';
            const relatorio = grupo_economico == 'FACELL' ? 'portab-facell' : 'portab-fort';

            let where = `WHERE  
            statusLinha != 'CANCELADA' 
            AND statusLinha != 'DUPLICIDADE'
            AND NOT modalidade = 'PORTABILIDADE PRÉ-PAGO' AND NOT gsmProvisorio IS NULL AND grupo_economico = ? AND DATE_FORMAT(dtAtivacao, '%Y-%m') = ? `
            const params = [grupo_economico, anoMes]

            if (apenasPendencias) {
                where += ` AND NOT(status_portabilidade = 'ATIVA' || status_portabilidade = 'ANTIGO') `
            }
            if (filial) {
                where += ` AND filial = ? `
                params.push(filial)
            }
            if (vendedor) {
                where += ` AND vendedor = ? `
                params.push(vendedor)
            }

            const [tabela] = await conn.execute(`SELECT 
                id, filial, pedido, modalidade, dtAtivacao, gsm, gsmProvisorio, status_portabilidade, motivo_portabilidade, plaOpera, vendedor, cpf_cliente, cliente, obs_adm_portab, obs_gestor_portab
                FROM ${facell_docs} ${where}`, params)

            const [grafico] = await conn.execute(`SELECT 
                count(id) as qtde, status_portabilidade
                FROM ${facell_docs} ${where}
                GROUP BY status_portabilidade
                `, params)

            var grafico2 = []
            if (filial) {
                [grafico2] = await conn.execute(`SELECT 
                        count(id) as total, 
                        SUM(
                        CASE 
                            WHEN status_portabilidade = 'ATIVA' OR status_portabilidade = 'ANTIGO' THEN 1
                            ELSE 0
                        END) as ativa,
                        SUM(CASE 
                            WHEN status_portabilidade <> 'ATIVA' AND status_portabilidade <> 'ANTIGO' THEN 1
                            ELSE 0
                        END) as verificar,
                        vendedor
                        FROM ${facell_docs} ${where}
                        GROUP BY vendedor
                        `, params)
            } else {
                [grafico2] = await conn.execute(`SELECT 
                    count(id) as total, 
                    SUM(CASE 
                        WHEN status_portabilidade = 'ATIVA' OR status_portabilidade = 'ANTIGO' THEN 1
                        ELSE 0
                    END) as ativa,
                    SUM(CASE 
                        WHEN status_portabilidade <> 'ATIVA' AND status_portabilidade <> 'ANTIGO' THEN 1
                        ELSE 0
                    END) as verificar,
                    filial
                    FROM ${facell_docs} ${where}
                    GROUP BY filial
                    `, params)
            }



            const [rowUltimaAtt] = await conn.execute(`SELECT data FROM facell_esteira_att WHERE relatorio = ? `, [relatorio])
            const ultimaAtt = rowUltimaAtt && rowUltimaAtt[0] && rowUltimaAtt[0]['data'] || null

            resolve({
                tabela, grafico, grafico2, ultimaAtt
            })
        } catch (error) {
            console.error('ESTEIRA_PORTABILIDADES', error)
            reject(error)
        } finally {
            conn.release()
        }
    })
}

module.exports = {
    listarPortabilidadesSolicitadas
}