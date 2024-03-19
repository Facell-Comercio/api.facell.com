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
            console.log(req.body)
            const {email, senha } = req.body;
            if(!email){
                throw new Error('Preencha o email!')
            }

            if(!senha){
                throw new Error('Preencha a senha!')
            }

            const [rowUser] = await db.execute(`SELECT u.*, p.perfil FROM users u LEFT JOIN users_perfis p ON p.id = u.id_perfil WHERE email = ?`, [email])
            const user = rowUser && rowUser[0]

            if(!user){
                throw new Error('Usuário ou senha inválidos!')
            }
           
            const matchPass = await bcrypt.compare(senha, user.senha)
            if(!matchPass){
                throw new Error('Usuário ou senha inválidos!')
            }
            user.senha = '';
            const token = jwt.sign({
                user:user
            }, process.env.SECRET)
            
            console.log(token, user)
            resolve({token, user})
        } catch (error) {
            console.log(error)
            reject(error)
        }
    })
}

module.exports = {
    register,
    login,
}