
require("dotenv").config();
const { db } = require('../../mysql');
const fs = require('fs');
const path = require('path');
const { logger } = require('../../logger');
const { gdrive } = require("../libs/google");

const { pipeline } = require('stream');
const { promisify } = require('util');
const asyncPipeline = promisify(pipeline);

const GDRIVE_FOLDERS = {
    id: process.env.DRIVE_FOLDER,
    financeiro: {
        id: process.env.DRIVE_FOLDER_FINANCEIRO,
    },
    logistica: {
        id: process.env.DRIVE_FOLDER_LOGISTICA,
    },
    pessoal: {
        id: process.env.DRIVE_FOLDER_PESSOAL,
    },
    comercial: {
        id: process.env.DRIVE_FOLDER_COMERCIAL
    }
}

async function createFolder(auth, folderName, parentFolderId = null) {
    const fileMetadata = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: parentFolderId ? [parentFolderId] : []
    };
    const res = await gdrive.files.create({
        resource: fileMetadata,
        fields: 'id'
    });
    return res.data;
}

async function clearTempDriveFiles(){
    const conn = await db.getConnection()
    try {
        const [rows] = await conn.execute(`SELECT id, created_at FROM temp_files`)
        for(const row of rows){
            try {
                await deleteFile(row.id)
            } catch (error) { }
        }
    } catch (error) {
        logger.error({
            module: 'STORAGE', origin: 'GOOGLE_DRIVE', method: 'UPLODAD_FILE',
            data: { message: error.message, stack: error.stack, name: error.name }
        })
    }
    return
}

// * OK
function uploadFile(req) {
    return new Promise(async (resolve, reject) => {
        try {
            const file = req.file;
            if (!file) {
                throw new Error('Falha no upload do arquivo...')
            }
            const { folderName } = req.body;
            let folderId = GDRIVE_FOLDERS.id;
            if (folderName) {
                try {
                    let nestedFolder = GDRIVE_FOLDERS[folderName] && GDRIVE_FOLDERS[folderName].id
                    if (nestedFolder) {
                        folderId = nestedFolder
                    }
                } catch (error) { }
            }
            // const filePath = path.join(process.env.BASE_DIR, 'public', 'temp',req.file.path);
            const filePath = path.join(process.cwd(), file.path);
            const mimetype = file.mimetype
            const fileMetadata = {
                name: file.filename,
                parents: [folderId],
            };
            const media = {
                mimeType: file.mimetype,
                body: fs.createReadStream(filePath),
            };
            const response = await gdrive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            const fileId = response.data.id;
            const fileUrl = createGoogleDriveUrl({fileId: fileId, mimetype: mimetype})
            resolve({ fileUrl, fileId });
        } catch (error) {
            logger.error({
                module: 'STORAGE', origin: 'GOOGLE_DRIVE', method: 'UPLODAD_FILE',
                data: { message: error.message, stack: error.stack, name: error.name }
            });
            reject(error);
        }
    })
}

// * OK
async function preUploadFile(req) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const { fileId, fileUrl } = await uploadFile(req)
            await conn.execute(`INSERT INTO temp_files (id) VALUES (?)`, [extractGoogleDriveId(fileUrl)])
            resolve({ fileUrl })
        } catch (error) {
            reject(error)
        } finally {
            conn.release()
        }
    })
}

// * OK
function createGoogleDriveUrl({fileId, mimetype}) {
    if (!fileId) return null;
    if(mimetype && mimetype.toLowerCase().includes('image')){
        return 'https://lh3.google.com/u/0/d/' + fileId
    }
    return 'https://drive.google.com/file/d/' + fileId + '/view'
}

// * OK
function extractGoogleDriveId(fileUrl){
    if(!fileUrl) return null;
    if (!fileUrl.includes('/')) {
        return fileUrl; 
    }
    const regex = /\/d\/([a-zA-Z0-9_-]+)/;
    const match = fileUrl.match(regex);
    return match ? match[1] : null;
}

// * OK
const getFile = async ({ fileId }) => {
    try {
        const response = await gdrive.files.get({
            fileId,
            fields: 'id, name, mimeType, webViewLink, webContentLink',
        });
        res.status(200).json(response.data);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

// * OK
const downloadFile = async ({fileId}) => {
    try {
        const fileMetadata = await gdrive.files.get({
            fileId: fileId,
            fields: 'name'
        });

        const fileName = fileMetadata.data.name;
        const destPath = path.join(process.cwd(), 'public', 'temp', fileName);
        const dest = fs.createWriteStream(destPath);

        return new Promise((resolve, reject) => {
            gdrive.files.get(
                {
                    fileId,
                    alt: 'media',
                },
                { responseType: 'stream' },
                (err, { data }) => {
                    if (err) {
                        const error = new Error(err.message);
                        logger.error({
                            module: 'STORAGE',
                            origin: 'GOOGLE_DRIVE',
                            method: 'DOWNLOAD_FILE',
                            data: { message: error.message, stack: error.stack, name: error.name }
                        });
                        return reject(error);
                    }

                    asyncPipeline(data, dest)
                        .then(() => resolve(destPath))
                        .catch((error) => {
                            logger.error({
                                module: 'STORAGE',
                                origin: 'GOOGLE_DRIVE',
                                method: 'DOWNLOAD_FILE',
                                data: { message: error.message, stack: error.stack, name: error.name }
                            });
                            reject(error);
                        });
                }
            );
        });
    } catch (error) {
        logger.error({
            module: 'STORAGE',
            origin: 'GOOGLE_DRIVE',
            method: 'DOWNLOAD_FILE',
            data: { message: error.message, stack: error.stack, name: error.name }
        });
        throw error;
    }
};

// * OK
function deleteFile(fileUrl) {
    return new Promise(async (resolve, reject) => {
        const conn = await db.getConnection()
        try {
            const fileId = extractGoogleDriveId(fileUrl)
            if (!fileId) {
                throw new Error('ID do arquivo não recebido!')
            }
            await gdrive.files.delete({
                fileId: fileId,
            });
            await conn.execute(`DELETE FROM temp_files WHERE id = ?`, [fileId])
            resolve(true);
        } catch (error) {
            logger.error({
                module: 'STORAGE', origin: 'GOOGLE_DRIVE', method: 'DELETE_FILE',
                data: { message: error.message, stack: error.stack, name: error.name }
            });
            resolve(false);
        }finally{
            conn.release()
        }
    })
}

module.exports = {
    uploadFile,
    preUploadFile,
    downloadFile,
    createGoogleDriveUrl,
    extractGoogleDriveId,
    getFile,
    deleteFile,
    clearTempDriveFiles,
}