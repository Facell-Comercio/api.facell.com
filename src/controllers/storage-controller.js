
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
    id: '1B9t4ElmcMmrUsIx3BbYkDLEREJx_H22R',
    financeiro: {
        id: '1BXoHUlWAdjtuYOcBFAK5RR3wrEiwNmfz',
    },
    logistica: {
        id: '1kv-ZYd7JIOVtgj2zlzlQ9hnRmyo4sL2k',
    },
    pessoal: {
        id: '1dgLJvBZZP62fWT89QotJjT17bF1i9aP3',
    },
    comercial: {
        id: '1-8mWa-UQxVq3sWHJcmnyMEPlgDpOqDQd'
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

            const fileMetadata = {
                name: file.filename,
                parents: [folderId],
            };
            const media = {
                mimeType: file.mimeType,
                body: fs.createReadStream(filePath),
            };
            const response = await gdrive.files.create({
                resource: fileMetadata,
                media: media,
                fields: 'id',
            });
            resolve({ fileId: response.data.id });
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
            const { fileId } = await uploadFile(req)
            await conn.execute(`INSERT INTO temp_files (id) VALUES (?)`, [fileId])
            resolve({ fileId })
        } catch (error) {
            reject(error)
        } finally {
            conn.release()
        }
    })
}

// * OK
function createGoogleDriveUrl(id) {
    if (!id) return null;
    return 'https://drive.google.com/file/d/' + id + '/view'
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
function deleteFile({fileId}) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!fileId) {
                throw new Error('ID do arquivo não recebido!')
            }
            await gdrive.files.delete({
                fileId: fileId,
            });
            resolve(true);
        } catch (error) {
            logger.error({
                module: 'STORAGE', origin: 'GOOGLE_DRIVE', method: 'DELETE_FILE',
                data: { message: error.message, stack: error.stack, name: error.name }
            });
            reject(error);
        }
    })
}

module.exports = {
    uploadFile,
    preUploadFile,
    downloadFile,
    createGoogleDriveUrl,
    getFile,
    deleteFile,
}