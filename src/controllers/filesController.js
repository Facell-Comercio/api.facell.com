const { unlink } = require("fs/promises");

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


module.exports = {
    deleteFile,
}