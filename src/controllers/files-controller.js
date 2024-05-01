const { unlink } = require("fs/promises");
const path = require('path');
const fs = require('fs');
const JSZip = require('jszip');
require('dotenv').config();

async function deleteFile(filePath) {
    try {
        await unlink(filePath);
        return true;
    } catch (error) {
        return false;
    }
}

function createUploadsPath(texto){
    if(!texto) return null;
    const partes = texto.split(/[\\/]/)
    const fileName = partes[partes.length -1]?.trim()
    if(!fileName) return null;
    return path.join(process.env.BASE_DIR, 'public', 'uploads', fileName)
}

function zipFiles({ items }) {
    // * Cria um zip com base na estrutura de objeto a seguir:
    // {
    //     items: [
    //       {
    //         type: 'folder',
    //         folderName: 'arquivos',
    //         items: [
    //           {
    //             type: 'folder',
    //             folderName: '01',
    //             items: [
    //               { type:'file', fileName: 'IMG Alex.jpg', filePath: createUploadsPath('eu_n7gr6lo82xvjv7cxaq417nje.jpg') },
    //               { type:'file', fileName: 'IMG Leandro.png', filePath: createUploadsPath('Leandro_mx77q4c8372vfyf5vmx9qdp7.png') },
    //             ]
    //           },
    //           {
    //             type: 'folder',
    //             folderName: '02',
    //             items: [
    //               { type:'file', fileName: 'BOLETO 102030.pdf', filePath: createUploadsPath('NOTAS_-_Manual_Tecnico_SISPAG__kqx5ixqs9oq3k1bzwmmlqa0k.pdf') },
    //               { type:'file', fileName: 'BOLETO 111213.pdf', filePath: createUploadsPath('Parcial 04-04 17_iwptugddgzbrljwretm1aje2.pdf') },
    //             ]
    //           },

    //         ]
    //       },
    //       {
    //         type: 'file', fileName: 'Relatório.xlsx', filePath: createUploadsPath('rateio-novo-titulo_ap7iu8h7ns4uaw296q9kfcyj.xlsx')
    //       }
    //     ]
    //   }
    return new Promise(async (resolve, reject) => {
        try {
            const zip = new JSZip();

            async function addItemsToZip(items, parentPath = '') {
                for (const item of items) {
                    if (item.type === 'folder') {
                        const folderPath = parentPath ? `${parentPath}/${item.folderName}` : item.folderName;
                        await addItemsToZip(item.items, folderPath);
                    } else if (item.type === 'file') {
                        const content = fs.readFileSync(item.filePath);
                        const filePath = parentPath ? `${parentPath}/${item.fileName}` : item.fileName;
                        zip.file(filePath, content);
                    }
                }
            }
            await addItemsToZip(items);

            zip.generateAsync({ type: 'nodebuffer' }).then(content => {
                resolve(content)
            }).catch(error => {
                reject('ERROR_ZIP_FILES', error)
            });
            
        } catch (error) {
            console.log('ERROR_ZIP_FILES', error)
            reject(error)
            return
        }
    })
}

async function clearTempFolder() {
    try {
        const BASE_DIR = process.env.BASE_DIR;
        if (!BASE_DIR) {
            throw new Error(`BASE_DIR Empty: ${BASE_DIR}`)
        }

        const pathTemp = path.join(BASE_DIR, 'public', 'temp')
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

function urlContemTemp(url) {
    return url.includes("/temp/");
}

// Função para mover um arquivo da pasta temp para a pasta uploads
function moverArquivoTempParaUploads(url) {
    return new Promise((resolve, reject) => {
        if (!url) {
            resolve('')
        }
        if (urlContemTemp(url)) {
            const nomeArquivo = url.split('/').pop(); // Captura o nome do arquivo da URL
            const origem = path.join(process.env.BASE_DIR, 'public', 'temp', nomeArquivo);
            const destino = path.join(process.env.BASE_DIR, 'public', 'uploads', nomeArquivo);
            const novaUrl = `${process.env.BASE_URL}/uploads/${nomeArquivo}`;

            // Move o arquivo da pasta temp para a pasta uploads
            if (fs.existsSync(destino)) {
                resolve(novaUrl)
            }
            fs.rename(origem, destino, (err) => {
                if (err) {
                    resolve('')
                } else {
                    resolve(novaUrl);
                }
            });
        } else {
            resolve(url);
        }
    });
}

function replaceFilePath(url) {
    return new Promise(async (resolve, reject) => {
        try {
            if(!url || typeof url !== 'string'){
                resolve(null)
                return;
            }
            const partes = url.split('uploads/')
            const fileName = partes[1];

            const BASE_DIR = process.env.BASE_DIR;
            const newPath = path.join(BASE_DIR, 'public', 'uploads', fileName)
            
            resolve(newPath)
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    deleteFile,
    clearTempFolder,
    moveFile,
    urlContemTemp,
    moverArquivoTempParaUploads,
    replaceFilePath,
    createUploadsPath,
    zipFiles,
}