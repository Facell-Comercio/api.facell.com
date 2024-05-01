const { parse: parseOFX } = require('ofx-js');
const fs = require('fs');
const path = require('path')
require('dotenv').config();

async function lerOFX(buffer) {
    return new Promise(async (resolve, reject) => {
        try {
            const pathOFX = path.join(process.env.BASE_DIR, "public/uploads/teste.ofx");
            const ofxString = await readOFX(pathOFX)

            if (typeof ofxString !== 'string') {
                throw new Error('Não consegui ler o arquivo!')
            }
            const ofxData = await parseOFX(ofxString)
            // do something...
            console.log(ofxData)
            resolve(ofxData)

        } catch (error) {

        }
    })
}

async function readOFX(caminho) {
    return new Promise((resolve, reject) => {
        fs.readFile(caminho, 'utf-8', (err, data) => {
            if (err) {
                reject('Não consegui ler')
            } else {
                resolve(data)
            }
        });
    })
}

module.exports = {
    lerOFX
}