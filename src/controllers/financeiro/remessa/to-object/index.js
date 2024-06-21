const { logger } = require("../../../../../logger")
const rules = require("../layout/rules")
const { checkTipoRegistroRemessa, transformStringToObject, checkIsPixByLoteRemessa, checkTipoSegmentoDetalhe } = require("./util")

const remessaToObject = (txt) => {
    return new Promise(async (resolve, reject) => {
        try {
            if(!txt){
                throw new Error('Arquivo de texto não recebidos por parâmetro!')
            }
            const codigo_banco = txt.substring(0,3)

            const banco = rules.bancosValidos.find(banco=>banco.codigo == codigo_banco)
            if(!banco){
                throw new Error(`A aplicação não está programada para lidar com o banco ${codigo_banco}. Procure a equipe de desenvolvimento`)
            }
            const layoutArquivoHeader = rules[banco.nome].ArquivoHeader
            const layoutArquivoTrailing = rules[banco.nome].ArquivoTrailing
            
            const layoutLoteHeader = rules[banco.nome].Pagamento.LoteHeader
            const layoutLoteTrailing = rules[banco.nome].Pagamento.LoteTrailing

            const result = {
                arquivoHeader: {},
                lotes: [
                    {
                        loteHeader: {},
                        detalhes: [],
                        loteTrailing: {}
                    }
                ],
                arquivoTrailing: {},
            }
            const linhas = txt.split('\n')
            let lote = 0;
            let detalhe = 0;
            let isPix = false;
            for(const linha of linhas) {
                if(linha){
                    const tipo_registro = checkTipoRegistroRemessa(linha)
                    if(tipo_registro == 0){
                        result.arquivoHeader = transformStringToObject(layoutArquivoHeader, linha)
                    }
                    if(tipo_registro == 9){
                        result.arquivoTrailing = transformStringToObject(layoutArquivoTrailing, linha)
                    }
                    if(tipo_registro == 1){
                        if(lote !== 0){
                            result.lotes.push({
                                loteHeader: {},
                                detalhes: [],
                                loteTrailing: {}
                            })
                        }
                        isPix = checkIsPixByLoteRemessa(linha)
                        result.lotes[lote].loteHeader = transformStringToObject(layoutLoteHeader, linha)
                    }
                    if(tipo_registro == 5){
                        result.lotes[lote].loteTrailing = transformStringToObject(layoutLoteTrailing, linha)
                        lote++
                        detalhe = 0
                    }
                    if(tipo_registro == 3){
                        const segmento = checkTipoSegmentoDetalhe(linha, isPix)
                        const layoutDetalhe = rules[banco.nome]['Pagamento']['Detail'][segmento]
                        if(!layoutDetalhe){
                            continue;
                        }
                        const obj = transformStringToObject(layoutDetalhe, linha)
                        result.lotes[lote].detalhes.push(obj)
                    }
                    
                }
            };

            resolve(result)
            return
        } catch (error) {
            logger.error({
                module: 'FINANCEIRO', origin: 'REMESSA', method: 'TO-OBJECT',
                data: { message: error.message, stack: error.stack, name: error.name }
            })
            reject(error)
        }
    })
}


module.exports = {
    remessaToObject
}