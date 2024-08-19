const XLSX = require('xlsx');
const fs = require('fs').promises;
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");

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
            const data = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1, 
                range: "A18:Y300000",
            });

            const headers = data[0];
            const rows = data.slice(1);
            
            const formattedData = rows.filter(r=>r[0] !== undefined).map(row => {
                let rowData = {};
                headers.forEach((header, index) => {
                    rowData[header] = row[index];
                });
                return rowData;
            });

            if (!formattedData || formattedData.length === 0) {
                throw new Error('Arquivo vazio!')
            }

            conn = await db.getConnection()
            conn.config.namedPlaceholders = true

            for (const row of formattedData) {
                const txid = row['txid'] ? row['txid'].trim() : null;
                if (!txid) continue;
                const txidFilial = txid.substring(0, 13);

                const [rowFilial] = await conn.execute(`SELECT id FROM filiais WHERE txid = :txid `, { txid: txidFilial })
                const filial = rowFilial && rowFilial[0]
                if (!filial) {
                    throw new Error(`Filial não localizada pelo TXID: ${txidFilial}`)
                }

                const dataVenda = row['data do pagamento'].split('/').reverse().join('-')
                const devolucao = row['tem devolução?'] == 'Sim' ? 1 : 0
                const obj = {
                    txid: txid,
                    id_filial: filial.id,
                    data_venda: dataVenda,
                    valor: devolucao ? row['valor recebido'] * -1 : row['valor recebido'],
                    devolucao: devolucao,
                    banco: 'ITAU',
                }
                
                await conn.execute(`INSERT IGNORE fin_vendas_pix 
                    (
                        txid,
                        id_filial,
                        data_venda,
                        valor,
                        devolucao,
                        banco

                    ) VALUES 
                    (
                        :txid,
                        :id_filial,
                        :data_venda,
                        :valor,
                        :devolucao,
                        :banco
                    )`, obj)

            }

            const result = true

            await conn.commit()
            resolve(result)
        } catch (error) {
            if (conn) await conn.rollback();
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERENCIA_DE_CAIXA', method: 'IMPORT_PIX_ITAU',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release()
            if (filePath) {
                try {
                    await fs.unlink(filePath)
                } catch (err) {}
            }
        }
    })
}