const XLSX = require('xlsx');
const fs = require('fs').promises;
const { formatDate } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
module.exports = async (req) => {
    return new Promise(async (resolve, reject) => {
        let conn
        try {
            const { file } = req;

            // ^ Validações
            if (!file) {
                throw new Error('Falha no upload do arquivo, tente novamente!')
            }

            const fileBuffer = await fs.readFile(file.path);
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 9 });
            // Separar o cabeçalho e os dados
            const headers = data[0];
            const rows = data.slice(1);

            const formattedData = rows.map(row => {
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
                const cnpj = row['CPF/CNPJ do estabelecimento'].replace(/[^a-zA-Z0-9]/g, '')
                const [rowFilial] = await conn.execute(`SELECT id FROM filiais WHERE cnpj = :cnpj `, { cnpj })
                const filial = rowFilial && rowFilial[0]
                if (!filial) {
                    throw new Error(`Filial não localizada pelo CNPJ: ${cnpj}`)
                }

                const dataVenda = row['Data da venda'].split('/').reverse().join('-')
                const obj = {
                    id_filial: filial.id,
                    estabelecimento: row['Estabelecimento'],
                    data_venda: dataVenda,
                    valor_venda: row['Valor bruto'],
                    taxa: row['Taxa/tarifa'],
                    forma_pgto: row['Forma de pagamento'],
                    parcelas: row['Quantidade total de parcelas'] == '' ? null : parseInt(row['Quantidade total de parcelas']),
                    bandeira: row['Bandeira'],
                    status: row['Status da venda'],
                    motivo: row['Motivo'] || null,
                    cod_autorizacao: row['Código de autorização'],
                    nsu: row['NSU/DOC'],
                    cod_venda: row['Código da venda'],
                    canal_venda: row['Canal da venda'],
                    num_maquina: row['Número da máquina'],
                    adquirente: 'CIELO',
                }
                // console.log(obj);

                await conn.execute(`INSERT IGNORE fin_vendas_cartao 
                    (
                        id_filial,
                        estabelecimento,
                        data_venda,
                        valor_venda,
                        forma_pgto,
                        parcelas,
                        bandeira,
                        taxa,
                        status,
                        motivo,
                        cod_autorizacao,
                        nsu,
                        cod_venda,
                        canal_venda,
                        num_maquina,
                        adquirente
                    ) VALUES 
                    (
                        :id_filial,
                        :estabelecimento,
                        :data_venda,
                        :valor_venda,
                        :forma_pgto,
                        :parcelas,
                        :bandeira,
                        :taxa,
                        :status,
                        :motivo,
                        :cod_autorizacao,
                        :nsu,
                        :cod_venda,
                        :canal_venda,
                        :num_maquina,
                        :adquirente
                    )`, obj)

            }
            // * Insert em log de importações de relatórios:
            await conn.execute(`INSERT INTO log_import_relatorio (id_user, relatorio, descricao ) VALUES (id_user, relatorio, descricao)`,
                {
                    id_user: req.user.id,
                    relatorio: 'CIELO-VENDAS',
                    descricao: ` ${rows.length} linhas importadas!`
                })

            const result = true

            await conn.commit()
            resolve(result)
        } catch (error) {
            if (conn) await conn.rollback();
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'CONFERENCIA_DE_CAIXA', method: 'IMPORT_CIELO_VENDAS',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release()
        }
    })
}