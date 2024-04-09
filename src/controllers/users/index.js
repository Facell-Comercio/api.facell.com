
const { x } = require('pdfkit');
const { db } = require('../../../mysql');
const { urlContemTemp, moverArquivoTempParaUploads } = require('../files-controller');

function getAll(req) {
    return new Promise(async (resolve, reject) => {
        const { user } = req
        // user.perfil = 'Financeiro'
        if (!user) {
            reject('Usuário não autenticado!')
            return false
        }
        // Filtros
        const { filters, pagination } = req.query
        const { pageIndex, pageSize } = pagination || { pageIndex: 0, pageSize: 5 }
        const { termo } = filters || { termo: null }

        var where = ` WHERE 1=1 `
        const params = []

        if (termo) {
            where += ` AND u.nome LIKE CONCAT('%', ?, '%')`
            params.push(termo)
        }

        const offset = pageIndex * pageSize

        try {
            const [rowQtdeTotal] = await db.execute(`SELECT 
            COUNT(u.id) as qtde 
            FROM users u
             ${where} `, params)
            const qtdeTotal = rowQtdeTotal && rowQtdeTotal[0] && rowQtdeTotal[0]['qtde'] || 0;

            params.push(pageSize)
            params.push(offset)
            var query = `
            SELECT u.*, '*****' as senha FROM users u
            ${where}
            
            LIMIT ? OFFSET ?
            `;
            console.log(query)

            console.log(params)
            const [rows] = await db.execute(query, params)

            // console.log('Fetched users', users.length)
            const objResponse = { rows: rows, pageCount: Math.ceil(qtdeTotal / pageSize), rowCount: qtdeTotal }
            console.log(objResponse)
            resolve(objResponse)
        } catch (error) {
            reject(error)
        }
    })
}

function getOne(req) {
    return new Promise(async (resolve, reject) => {
        const { id } = req.params
        try {
            const [rowUser] = await db.execute(`
            SELECT u.*, '***' as senha
            FROM users u
            WHERE u.id = ?
            `, [id])

            const user = rowUser && rowUser[0]

            const [permissoes] = await db.execute(`
            SELECT up.*, p.nome
            FROM users_permissoes up
            INNER JOIN permissoes p ON p.id = up.id_permissao
            WHERE up.id_user = ?
            `, [id])

            const [departamentos] = await db.execute(`
            SELECT ud.*, d.nome
            FROM users_departamentos ud
            INNER JOIN departamentos d ON d.id = ud.id_departamento
            WHERE ud.id_user = ?
            `, [id])

            const [filiais] = await db.execute(`
            SELECT uf.*, f.nome
            FROM users_filiais uf
            INNER JOIN filiais f ON f.id = uf.id_filial
            WHERE uf.id_user = ?
            `, [id])

            const [centros_custo] = await db.execute(`
            SELECT ucc.*, fcc.nome
            FROM users_centros_custo ucc
            INNER JOIN fin_centros_custo fcc ON fcc.id = ucc.id_centro_custo
            WHERE ucc.id_user = ?
            `, [id])

            const objUser = {
                ...user,
                permissoes,
                departamentos,
                filiais,
                centros_custo
            }
            console.log(objUser)
            resolve(objUser)
            return
        } catch (error) {
            console.log(error)
            reject(error)
            return
        }
    })
}

function update(req) {
    return new Promise(async (resolve, reject) => {
        const { 
            id, nome, email, active, img_url,
            filiais, 
            updateFiliais,
            departamentos,
            updateDepartamentos, 
            centros_custo ,
            updateCentrosCusto,
            permissoes, 
            updatePermissoes,
            
        } = req.body;
        console.log(req.body)

        const conn = await db.getConnection();
        try {
            if (!id) {
                throw new Error('ID do usuário não enviado!')
            }
            if (!nome) {
                throw new Error('Nome não enviado!')
            }
            if(!email){
                throw new Error('Email não enviado!')
            }
            await conn.beginTransaction();

            // Verificar se a imagem é temporária
            const isImgTemp = urlContemTemp(img_url)
            
            var newImgUrl = img_url;
            if(isImgTemp){
                console.log('Imagem era TEMP, então tentei mover...')
                // Persistir imagem
                const urlImgPersistida = await moverArquivoTempParaUploads(img_url)
                newImgUrl = urlImgPersistida
            }

            // Atualização de dados do usuário
            await conn.execute('UPDATE users SET nome = ?, email = ?, img_url = ?, active = ? WHERE id = ?', [nome, email, newImgUrl, active, id])

            // Atualização de arrays
            if(updateFiliais){
                await conn.execute(`DELETE FROM users_filiais WHERE id_user = ?`, [id])
                for(const uf of filiais){
                    await conn.execute(`INSERT INTO users_filiais (id_user, id_filial, gestor) VALUES (?,?,?)`, [id, uf.id_filial, uf.gestor])
                    
                };
            }
            if(updateDepartamentos){
                await conn.execute(`DELETE FROM users_departamentos WHERE id_user = ?`, [id])
                for(const udp of departamentos){
                    await conn.execute(`INSERT INTO users_departamentos (id_user, id_departamento, gestor) VALUES (?,?,?)`, [id,udp.id_departamento, udp.gestor])
                    
                };
            }
            if(updateCentrosCusto){
                await conn.execute(`DELETE FROM users_centros_custo WHERE id_user = ?`, [id])
                for(const ucc of centros_custo){
                    await conn.execute(`INSERT INTO users_centros_custo (id_user, id_centro_custo, gestor) VALUES (?,?,?)`, [id, ucc.id_centro_custo, ucc.gestor])
                    
                };
            }
            if(updatePermissoes){
                await conn.execute(`DELETE FROM users_permissoes WHERE id_user = ?`, [id])
                for(const user_permissao of permissoes){
                    await conn.execute(`INSERT INTO users_permissoes (id_user, id_permissao) VALUES (?,?)`, [id, user_permissao.id_permissao])
                    
                };    
            }
            
            await conn.commit()

            resolve({message: 'Sucesso!'})
        } catch (error) {
            await conn.rollback()
            console.log('ERRO_USERS_UPDATE', error)
            reject(error)
        }
    })
}

function remove(req) {
    return new Promise(async (resolve, reject) => {

        try {

        } catch (error) {

        }
    })
}

function add(req) {
    return new Promise(async (resolve, reject) => {

        try {

        } catch (error) {

        }
    })
}


module.exports = {
    getAll,
    getOne,
    update,
    remove,
    add,
}