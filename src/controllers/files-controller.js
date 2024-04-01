const { unlink } = require("fs/promises");
const path = require('path');
const fs = require('fs');
require('dotenv').config();

async function deleteFile(filePath){
    try {
        await unlink(filePath);
        return true;
    } catch (error) {
        return false;
    }
}

async function zipFiles({fileNames}){
    return new Promise(async()=>{
        try {
            // todo passar pelos filenames, gerando os pathnames e anexando com jsZip
            const zip = 
            resolve(zip)
        } catch (error) {
            rejects(error)
            return      
        }
    })
}

async function clearTempFolder(){
    try {  
    const BASE_DIR = process.env.BASE_DIR;
    if(!BASE_DIR){
        throw new Error(`BASE_DIR Empty: ${BASE_DIR}`)
    }

    const pathTemp = path.join(BASE_DIR ,  'public', 'temp')
    fs.readdir(pathTemp, (err, arquivos) => {
        if (err) {
            console.error('Erro ao ler o diretório:', err);
            return;
        }

        arquivos.forEach(arquivo => {
            const caminhoArquivo = path.join(pathTemp, arquivo);

            fs.unlink(caminhoArquivo, err => {
                if (err) {
                    console.error('Erro ao excluir o arquivo:', err);
                    return;
                }

                console.log('Arquivo excluído:', arquivo);
            });
        });
    });
    console.log('CLEAR_TEMP: LIMPEZA REALIZADA!')
} catch (error) {
        console.log('ERROR_CLEAR_TEMP:', error)
}
}

function moveFile(origem, destino) {
    return new Promise((resolve, reject) => {
      // Verificar se o arquivo de origem existe
      if (!fs.existsSync(origem)) {
        reject(new Error('O arquivo de origem não existe.'));
        return;
      }
  
      // Mover o arquivo
      fs.rename(origem, destino, err => {
        if (err) {
          reject(err); // Rejeitar a Promise se houver um erro
          return;
        }
        resolve(); // Resolver a Promise se o arquivo for movido com sucesso
      });
    });
  }

async function moveTempToUploads(fileName){
    return new Promise(async (resolve, reject)=>{
        try {  
            const BASE_DIR = process.env.BASE_DIR;
            if(!BASE_DIR){
                throw new Error(`BASE_DIR Empty: ${BASE_DIR}`)
            }
        
            const tempPath = path.join(BASE_DIR ,  'public', 'temp', fileName)
            console.log(tempPath)
            const uploadsPath = path.join(BASE_DIR ,  'public', 'uploads', fileName)
            await moveFile(tempPath, uploadsPath)
            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    deleteFile,
    clearTempFolder,
    moveFile,
    moveTempToUploads
}