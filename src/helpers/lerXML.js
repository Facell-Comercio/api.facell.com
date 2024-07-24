const xml2js = require('xml2js');
const fs = require('fs');
const { format } = require('date-fns');
require('dotenv').config();

async function lerXML(pathXML) {
    return new Promise(async (resolve, reject) => {
        try {
            if(!pathXML){
                reject('Caminho do OFX não enviado!')
                return
            }
            const xmlString = await readXML(pathXML)

            if (typeof xmlString !== 'string') {
                throw new Error('Não consegui ler o arquivo!')
            }
            xml2js.parseString(xmlString, (err, result)=>{
                if(err){
                    reject(err)
                }else{
                    resolve(result)
                }
            })
            return;
        } catch (error) {
            reject(error)
        }
    })
}

async function readXML(caminho) {
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



module.exports = {
    lerXML
}