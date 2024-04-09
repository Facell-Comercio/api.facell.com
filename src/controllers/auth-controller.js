const {db} = require('../../mysql');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv');

async function register(req){
    return new Promise(async (resolve, reject)=>{
        try {
            const {email, senha, confirmaSenha, nome, id_perfil, id_grupo_economico, img_url } = req.body;
            if(!email){
                throw new Error('Preencha o email!')
            }

            if(!senha){
                throw new Error('Preencha a senha!')
            }

            if(senha !== confirmaSenha){
                throw new Error('Senha e confirmação não conferem!')
            }
            const [rowUser] = await db.execute('SELECT senha FROM users WHERE email = ?', [email]);
            if(rowUser.length !== 0){
                throw new Error('Não é possível utilizar este email!');
            }

            const senhaCriptografada = await bcrypt.hash(senha, 10);
            
            await db.execute('INSERT INTO users (email, senha, id_perfil, id_grupo_economico, nome) VALUES (?, ?, ?, ?, ?)', [email, senhaCriptografada, id_perfil, id_grupo_economico, nome])

            resolve()
        } catch (error) {
            reject(error)
        }
    })
}

async function login(req){
    return new Promise(async (resolve, reject)=>{
        try {
            const {email, senha } = req.body;
            if(!email){
                throw new Error('Preencha o email!')
            }

            if(!senha){
                throw new Error('Preencha a senha!')
            }

            const [rowUser] = await db.execute(`SELECT u.* FROM users u WHERE email = ?`, [email])
            const user = rowUser && rowUser[0]

            if(!user){
                throw new Error('Usuário ou senha inválidos!')
            }
           
            const matchPass = await bcrypt.compare(senha, user.senha)
            if(!matchPass){
                throw new Error('Usuário ou senha inválidos!')
            }
            
            user.senha = '';
            // Filiais de acesso
            const [filiais] = await db.execute(`
            SELECT f.id, f.nome, uf.gestor 
            FROM users_filiais uf
            INNER JOIN filiais f ON f.id = uf.id_filial
            WHERE uf.id_user = ?`, [user.id])
            user.filiais = filiais

            // Departamentos de acesso
            const [departamentos] = await db.execute(`
            SELECT  d.id, d.nome, ud.gestor 
            FROM users_departamentos ud
            INNER JOIN  departamentos d ON d.id = ud.id_departamento
            WHERE ud.id_user = ?`, [user.id])
            user.departamentos = departamentos

            // Permissoes
            const [permissoes] = await db.execute(`
            SELECT p.id, p.nome 
            FROM users_permissoes up
            INNER JOIN permissoes p ON p.id = up.id_permissao
            WHERE up.id_user = ?`, [user.id])
            user.permissoes = permissoes

            const token = jwt.sign({
                user:user,
                exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) //token válido por 7 dias
            }, process.env.SECRET)
            
            // console.log(token, user)
            resolve({token, user})
        } catch (error) {
            reject(error)
        }
    })
}

module.exports = {
    register,
    login,
}