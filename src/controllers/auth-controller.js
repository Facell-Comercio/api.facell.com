const { db } = require("../../mysql");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { logger } = require("../../logger");
const { enviarEmail } = require("../helpers/email");
require("dotenv");

async function register(req) {
  return new Promise(async (resolve, reject) => {
    try {
      const {
        email,
        senha,
        confirmaSenha,
        nome,
        id_perfil,
        id_grupo_economico,
        img_url,
      } = req.body;
      if (!email) {
        throw new Error("Preencha o email!");
      }

      if (!senha) {
        throw new Error("Preencha a senha!");
      }

      if (senha !== confirmaSenha) {
        throw new Error("Senha e confirmação não conferem!");
      }
      const [rowUser] = await db.execute(
        "SELECT senha FROM users WHERE email = ?",
        [email]
      );
      if (rowUser.length !== 0) {
        throw new Error("Não é possível utilizar este email!");
      }

      const senhaCriptografada = await bcrypt.hash(senha, 10);

      await db.execute(
        "INSERT INTO users (email, senha, id_perfil, id_grupo_economico, nome) VALUES (?, ?, ?, ?, ?)",
        [email, senhaCriptografada, id_perfil, id_grupo_economico, nome]
      );

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

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
    try {
      const { email, senha } = req.body;
      if (!email) {
        throw new Error("Preencha o email!");
      }

      if (!senha) {
        throw new Error("Preencha a senha!");
      }

      const [rowUser] = await db.execute(
        `SELECT u.* FROM users u WHERE email = ?`,
        [email]
      );
      const user = rowUser && rowUser[0];

      if (!user) {
        throw new Error("Usuário ou senha inválidos!");
      }

      const matchPass = await bcrypt.compare(senha, user.senha);
      const matchPassSenhaTemporaria = senha === user.senha_temporaria;

      if (!matchPass && !matchPassSenhaTemporaria) {
        throw new Error("Usuário ou senha inválidos!");
      }

      user.senha = "";
      // Filiais de acesso
      const [filiais] = await db.execute(
        `
            SELECT f.id, f.nome, uf.gestor, g.nome as grupo_economico 
            FROM users_filiais uf
            INNER JOIN filiais f ON f.id = uf.id_filial
            INNER JOIN grupos_economicos g ON g.id = f.id_grupo_economico
            WHERE uf.id_user = ?
            ORDER BY g.id, f.id
            `, [user.id])
            user.filiais = filiais

      // Departamentos de acesso
      const [departamentos] = await db.execute(
        `
            SELECT  d.id, d.nome, ud.gestor 
            FROM users_departamentos ud
            INNER JOIN  departamentos d ON d.id = ud.id_departamento
            WHERE ud.id_user = ?
            ORDER BY d.id
            `,
        [user.id]
      );
      user.departamentos = departamentos;

            // Centros de custo de acesso
            const [centros_custo] = await db.execute(`
            SELECT  fcc.id, fcc.nome, ucc.gestor, g.nome as grupo_economico 
            FROM users_centros_custo ucc
            INNER JOIN  fin_centros_custo fcc ON fcc.id = ucc.id_centro_custo
            INNER JOIN grupos_economicos g ON g.id = fcc.id_grupo_economico
            WHERE ucc.id_user = ?
            ORDER BY g.id, fcc.id
            `,
        [user.id]
      );
      user.centros_custo = centros_custo;

      // Permissoes
      const [permissoes] = await db.execute(
        `
            SELECT p.id, p.nome 
            FROM users_permissoes up
            INNER JOIN permissoes p ON p.id = up.id_permissao
            WHERE up.id_user = ?`,
        [user.id]
      );
      user.permissoes = permissoes;

      const token = jwt.sign(
        {
          user: user,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, //token válido por 7 dias
        },
        process.env.SECRET
      );

      // console.log(token, user)
      resolve({ token, user });
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "AUTH",
        method: "LOGIN",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      reject(error);
    }
  });
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
      const uuid = uuidv4();
      await enviarEmail({
        destinatarios: [email],
        assunto: "Instruções para Redefinição de Senha",
        corpo: `Olá ${user.nome}, recebemos uma solicitação para alterar a senha da sua conta.\nA senha temporária será ${uuid}\nSe você não solicitou a alteração, por favor ignore este email. Sua senha atual não será alterada.`,
      });
      await conn.execute(`UPDATE users SET senha_temporaria = ? WHERE id = ?`, [
        uuid,
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
      resolve();
      conn.release();
    }
  });
}

module.exports = {
  register,
  updateSenha,
  login,
  recuperarSenha,
};
