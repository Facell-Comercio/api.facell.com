const XLSX = require('xlsx');
const fs = require('fs').promises;
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const { formatDate } = require('date-fns');
const { excelDateToJSDate } = require('../../../../../helpers/mask');

module.exports = async (req) => {
    return new Promise(async (resolve, reject) => {
        let conn
        let filePath
        try {
            const { file } = req;

            // ^ Validações
            if (!file) {
                throw new Error('Falha no upload do arquivo, tente novamente!')
            }
            filePath = file.path;
            const fileBuffer = await fs.readFile(filePath);
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(worksheet);

            conn = await db.getConnection()
            conn.config.namedPlaceholders = true

            let i = 1;
            for (const row of rows) {
                
                const voucher = row['Codigo do voucher'] && row['Codigo do voucher'].trim();
                if (!voucher) {
                    continue;
                }

                if(!row['Nome da empresa']){
                    throw new Error(`Nome da filial não localizado! Linha: ${i}`)
                }
                const [rowFilial] = await conn.execute(`SELECT id FROM filiais WHERE nome_renov = :nome_renov `, { nome_renov: row['Nome da empresa'] })
                const filial = rowFilial && rowFilial[0]
                if (!filial) {
                    throw new Error(`Filial não localizada pelo Nome: ${row['Nome da empresa']}`)
                }
                const data_criacao = row['Criado em'] && excelDateToJSDate(row['Criado em'])
                const data_uso = row['Data de uso'] && excelDateToJSDate(row['Data de uso'])


                const obj = {
                    voucher: voucher,
                    id_filial: filial.id,
                    imei: row['Imei'] || null,
                    imei2: row['Imei2'] || null,
                    descricao: row['Descrição'] || null,
                    nome_vendedor: row['Nome do vendedor'] || null,
                    data: formatDate(data_criacao, 'yyyy-MM-dd'),
                    hora: formatDate(data_criacao, 'HH:mm:ss'),
                    status: row['Situacao do voucher'],
                    valor: row['Valor do voucher'],
                    data_uso: data_uso ? formatDate(data_uso, 'yyyy-MM-dd') : null,
                    hora_uso: data_uso ? formatDate(data_uso, 'HH:mm:ss') : null,
                }
                // console.log(obj);

                await conn.execute(`INSERT INTO renov_tradein 
                    (
                        voucher,
                        id_filial,
                        imei,
                        imei2,
                        descricao,
                        nome_vendedor,
                        data,
                        hora,
                        status,
                        valor,
                        data_uso,
                        hora_uso

                    ) VALUES 
                    (
                        :voucher,
                        :id_filial,
                        :imei,
                        :imei2,
                        :descricao,
                        :nome_vendedor,
                        :data,
                        :hora,
                        :status,
                        :valor,
                        :data_uso,
                        :hora_uso
                    )
                        ON DUPLICATE KEY UPDATE
                        valor = VALUES(valor),
                        status = VALUES(status),
                        data_uso = VALUES(data_uso),
                        hora_uso = VALUES(hora_uso),
                        imei = VALUES(imei),
                        imei2 = VALUES(imei2)

                        `, obj)
                i++;
            }

            // * Insert em log de importações de relatórios:
            await conn.execute(`INSERT INTO log_import_relatorio (id_user, relatorio, descricao ) VALUES (:id_user, :relatorio, :descricao)`, 
                {
                    id_user: req.user.id,
                    relatorio: 'RENOV-TRADEIN',
                    descricao: ` ${rows.length} linhas importadas!`
                })

            const result = true

            await conn.commit()
            resolve(result)
        } catch (error) {
            if (conn) await conn.rollback();
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERENCIA_DE_CAIXA', method: 'IMPORT_RENOV_TRADEIN',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release()
            if (filePath) {
                try {
                    await fs.unlink(filePath)
                } catch (err) { }
            }
        }
    })
}