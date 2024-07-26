const { logger } = require("../../../../../logger")
const { db } = require("../../../../../mysql")
const { lerXML } = require("../../../../helpers/lerXML")
const { downloadFile } = require("../../../storage-controller")
const path = require('path');

module.exports = function processarXml(req) {
    return new Promise(async (resolve, reject) => {
        let conn
        try {
            conn = await db.getConnection()
            const { fileUrl } = req.body || {}

            const pathFile = await downloadFile({ fileId: fileUrl })
            if (!pathFile) {
                throw new Error('Erro no download do Arquivo')
            }

            const objXml = await lerXML(pathFile);

            if (!objXml) {
                throw new Error('Erro na leitura do XML')
            }
            const NFe = objXml && objXml.nfeProc && objXml.nfeProc.NFe && objXml.nfeProc.NFe[0]
            const infNFe = NFe && NFe.infNFe && NFe.infNFe[0];

            if (!infNFe) {
                throw new Error('Erro na leitura do XML')
            }

            const ide = infNFe.ide && infNFe.ide[0]
            const num_doc = ide && ide.nNF && ide.nNF[0]
            const data_emissao = ide && ide.dhEmi && ide.dhEmi[0]

            const emit = infNFe.emit && infNFe.emit[0]
            const cnpj_fornecedor = emit && emit.CNPJ && emit.CNPJ[0]

            const dest = infNFe.dest && infNFe.dest[0]
            const cnpj_filial = dest && dest.CNPJ && dest.CNPJ[0]

            const total = infNFe.total && infNFe.total[0]
            const valor = total && total.ICMSTot && total.ICMSTot[0] && total.ICMSTot[0]['vNF'] && total.ICMSTot[0]['vNF'][0]

            let fornecedor;
            if (cnpj_fornecedor && typeof cnpj_fornecedor == 'string') {
                const [rowFornecedor] = await conn.execute(`SELECT id, nome, cnpj, id_forma_pagamento FROM fin_fornecedores WHERE cnpj = ? `, [cnpj_fornecedor])
                fornecedor = rowFornecedor && rowFornecedor[0]

            }

            let filial
            if (cnpj_filial && typeof cnpj_filial == 'string') {
                const [rowFilial] = await conn.execute(`SELECT id, nome, id_matriz, id_grupo_economico FROM filiais WHERE cnpj = ? `, [cnpj_filial])
                filial = rowFilial && rowFilial[0]
            }

            const result = {
                fornecedor,
                filial,
                valor,
                num_doc,
                data_emissao,
            }
            resolve(result)
        } catch (error) {
            reject(error)
            logger.error({
                module: 'FINANCEIRO', origin: 'TITULO A PAGAR', method: 'PROCESSAR_XML',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
        } finally {
            if (conn) conn.release()
        }
    })
}