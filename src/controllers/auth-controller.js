const { db } = require("../../mysql");
const { v4: uuidv4 } = require("uuid");
const { createId: cuid } = require("@paralleldrive/cuid2");

const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logger } = require("../../logger");
const { enviarEmail } = require("../helpers/email");
const { getOne } = require("./users");
require("dotenv");

async function updateSenha(req) {
  return new Promise(async (resolve, reject) => {
    const conn = await db.getConnection();
    try {
      const { senha, confirmaSenha, id } = req.body.params;

      if (senha !== confirmaSenha) {
        throw new Error("Senha e confirmação não conferem!");
      }
      const senhaCriptografada = await bcrypt.hash(senha, 10);
      await conn.execute("UPDATE users SET senha = ? WHERE id = ?", [
        senhaCriptografada,
        id,
      ]);

      resolve();
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "AUTH",
        method: "UPDATE_SENHA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    } finally {
      conn.release();
    }
  });
}

async function login(req) {
  return new Promise(async (resolve, reject) => {
    let conn
    try {
      conn = await db.getConnection();
      const { email, senha } = req.body;
      if (!email) {
        throw new Error("Preencha o email!");
      }

      if (!senha) {
        throw new Error("Preencha a senha!");
      }

      const [rowUserBanco] = await conn.execute(
        `SELECT u.id, u.email, u.senha, u.senha_temporaria FROM users u WHERE active = 1 AND email = ?`,
        [email]
      );
      const userBanco = rowUserBanco && rowUserBanco[0];

      if (!userBanco) {
        throw new Error("Usuário ou senha inválidos!");
      }
      let sucesso_login = false;
      try {
        const matchPass = await bcrypt.compare(senha, userBanco.senha);
        if(matchPass){
          sucesso_login = true
        }
      } catch (error) {
        sucesso_login = false
      }

      if(!sucesso_login && userBanco.senha_temporaria){
        try {
          const matchPassSenhaTemporaria = await bcrypt.compare(senha, userBanco.senha_temporaria);
          if(matchPassSenhaTemporaria){
            sucesso_login = true
          }
        } catch (error) {
          sucesso_login = false
        }
      }
      if(!sucesso_login){
        throw new Error("Usuário ou senha inválidos!");
      }
      const user = await getOne({params: {id: userBanco.id}})
      user.senha = "";

      const token = await gerarToken({user})

      resolve({ token, user });
    } catch (error) {
      logger.error({
        module: "ROOT", origin: "AUTH", method: "LOGIN",
        data: { message: error.message, stack: error.stack, name: error.name, },
      });
      reject(error);
    }finally{
      if(conn) conn.release()
    }
  });
}

async function gerarToken({user}){
  try {
    const token = jwt.sign(
      {
        user: user,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, //token válido por 7 dias
      },
      process.env.SECRET
    );
      return token
  } catch (error) {
    logger.error({
      module: "ROOT", origin: "AUTH", method: "GERAR_TOKEN",
      data: { message: error.message, stack: error.stack, name: error.name, },
    });
     return null
  }
}

async function recuperarSenha(req) {
  return new Promise(async (resolve) => {
    const conn = await db.getConnection();
    try {
      const { email } = req.body;

      if (!email) {
        throw new Error("Email não informado");
      }

      const [rowUser] = await conn.execute(
        "SELECT id, nome FROM users WHERE email = ? AND active = 1",
        [email]
      );
      if (rowUser.length === 0) {
        throw new Error("Usuário não encontrado");
      }
      const user = rowUser && rowUser[0];
      const senha_temporaria = cuid();

      const hash_senha_temporaria = await bcrypt.hash(senha_temporaria, 10);

      await enviarEmail({
        destinatarios: [email],
        assunto: "Instruções para Redefinição de Senha",
        corpo: `Olá ${user.nome}, recebemos uma solicitação para alterar a senha da sua conta.\nA senha temporária será ${senha_temporaria}\nSe você não solicitou a alteração, por favor ignore este email. Sua senha atual não será alterada.`,
      });
      await conn.execute(`UPDATE users SET senha_temporaria = ? WHERE id = ?`, [
        hash_senha_temporaria,
        user.id,
      ]);

    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "AUTH",
        method: "RECUPERAR_SENHA",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
    } finally {
      conn.release();
      resolve();
    }
  });
}

function validarToken(req){
  return new Promise(async(resolve, reject)=>{
    try {

      const user = await getOne({params: {id: req.user.id}})
      const token = await gerarToken({user})
      resolve(token)
    } catch (error) {
      reject(error)
      logger.error({
        module: "ROOT", origin: "AUTH", method: "VALIDAR_TOKEN",
        data: { message: error.message, stack: error.stack, name: error.name, },
      });
    }
  })
}

module.exports = {
  updateSenha,
  login,
  recuperarSenha,
  validarToken,
};
