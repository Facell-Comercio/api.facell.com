const { parse: parseOFX } = require('ofx-js');
const fs = require('fs');
const { format } = require('date-fns');
require('dotenv').config();

async function lerOFX(pathOFX) {
    return new Promise(async (resolve, reject) => {
        try {
            if(!pathOFX){
                reject('Caminho do OFX não enviado!')
                return
            }
            const ofxString = await readOFX(pathOFX)

            if (typeof ofxString !== 'string') {
                throw new Error('Não consegui ler o arquivo!')
            }
            const ofxData = await parseOFX(ofxString)
            resolve(ofxData)
            return;
        } catch (error) {
            reject(error)
        }
    })
}

async function readOFX(caminho) {
    return new Promise((resolve, reject) => {
        fs.readFile(caminho, 'utf-8', (err, data) => {
            if (err) {
                reject('Não consegui ler')
            } else {
                resolve(data.replace(/\r\n/g, '\n').replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, '&amp;'))
            }
        });
    })
}

function formatarDataTransacao(dataTransacao) {
    // Extrair os componentes da data
    const ano = parseInt(dataTransacao.slice(0, 4));
    const mes = parseInt(dataTransacao.slice(4, 6));
    const dia = parseInt(dataTransacao.slice(6, 8));

    // Criar um objeto Date
    const dataObjeto = new Date(ano, mes - 1, dia);

    // Formatar a data no formato do MariaDB ('YYYY-MM-DD')
    const dataFormatada = format(dataObjeto, 'yyyy-MM-dd');

    return dataFormatada;
}

module.exports = {
    lerOFX,
    formatarDataTransacao
}