const { db } = require('../../../../mysql')

function listarInformativos() {
    return new Promise(async (resolve, reject) => {
        try {
            const [informativos] = await db.execute(`SELECT * FROM facell_esteira_informativos ORDER BY id DESC LIMIT 30`)

            resolve(informativos)
            return true;
        } catch (error) {
            reject(error)
            return false;
        }

    })
}

function insertInformativo({ texto, url }) {
    return new Promise(async (resolve, reject) => {
        try {
            await db.execute(`INSERT INTO facell_esteira_informativos (texto, url, create_at) VALUES (?, ?, now())`, [texto, url])
            resolve()
            return true;
        } catch (error) {
            reject(error)
            return false;
        }
    })
}

function deletarInformativo({ id }) {
    return new Promise(async (resolve, reject) => {
        try {
            await db.execute(`DELETE FROM facell_esteira_informativos WHERE id=?`, [id])
            resolve()
            return true;
        } catch (error) {
            reject(error)
            return false;
        }
    })
}

function editarInformativo({ id, texto, url }) {
    return new Promise(async (resolve, reject) => {
        try {
            await db.execute(`UPDATE facell_esteira_informativos SET texto = ?, url = ? WHERE id=?`, [texto, url, id])
            resolve()
            return true;
        } catch (error) {
            reject(error)
            return false;
        }
    })
}

module.exports = {
    listarInformativos,
    deletarInformativo,
    editarInformativo,
    insertInformativo,
}