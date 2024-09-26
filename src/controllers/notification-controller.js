const { logger } = require("../../logger");
const { db } = require("../../mysql");
const WebPush = require("web-push");

require("dotenv").config();

const publicKey = process.env.WEBPUSH_PUBLIC_KEY;
const privateKey = process.env.WEBPUSH_PRIVATE_KEY;

const baseURL = process.env.BASE_URL;
const isDevelopment = process.env.NODE_ENV == "development";

//* Para que funcione em ambiente de desenvolvimento:
//* [] Instalar o ngrok (powershel) -> Exemplo usando o chocolatey
//*   - Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
//*   - choco install ngrok
//* [] Realiza o login no ngrok
//* [] Usar o comando -> ngrok http 7000 (No terminal do ngrok)
//* [] Substituir o valor da variável abaixo pelo "Fowarding"
const httpsBaseURL = "https://b5e8-187-19-163-124.ngrok-free.app";

WebPush.setVapidDetails(isDevelopment ? httpsBaseURL : baseURL, publicKey, privateKey);

function registerUserMachine(req) {
  return new Promise(async (resolve, reject) => {
    const { subscription, user } = req.body;
    const { endpoint, keys } = subscription || {};
    const { p256dh, auth } = keys || {};
    let conn;
    try {
      if (!endpoint || !p256dh || !auth) {
        throw new Error("Dados da inscrição incorretos");
      }
      conn = await db.getConnection();
      await conn.beginTransaction();
      //* Consulta se a chave passada já existe no banco de dados
      const [rowsMachines] = await conn.execute(
        "SELECT id FROM user_maquinas WHERE id_user = ? AND public_key = ? AND auth = ?",
        [user.id, p256dh, auth]
      );
      if (rowsMachines.length) {
        resolve();
        return;
      }

      //* Obtem a lista de todos os dispositivos associados ao usuário
      const [machines] = await conn.execute(
        "SELECT id FROM user_maquinas WHERE id_user = ? ORDER BY id ASC",
        [user.id]
      );

      //* Limitação de 5 dispositivos por usuário
      if (machines.length >= 5) {
        await conn.execute("DELETE FROM user_maquinas WHERE id = ?", [machines[0].id]);
      }

      //* Registra o novo dispositivo no banco de dados
      await conn.execute(
        "INSERT INTO user_maquinas (id_user, endpoint, public_key, auth) VALUES (?,?,?,?)",
        [user.id, endpoint, p256dh, auth]
      );

      await conn.commit();
      resolve();
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "NOTIFICATION",
        method: "REGISTER_USER_MACHINE",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function sendNotificationUser(req) {
  return new Promise(async (resolve, reject) => {
    const userId = req.params.id;
    const { message, title } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      const [machines] = await conn.execute(
        "SELECT endpoint, public_key, auth FROM user_maquinas WHERE id_user = ?",
        [userId]
      );
      if (!machines.length) {
        throw new Error("Usuário não encontrado");
      }

      //* Envia a notificação para cada dispositivo associado ao usuário
      for (const machine of machines) {
        try {
          const subscription = {
            endpoint: machine.endpoint,
            expirationTime: null,
            keys: {
              p256dh: machine.public_key,
              auth: machine.auth,
            },
          };
          const payload = JSON.stringify({
            title,
            body: message,
          });
          await WebPush.sendNotification(subscription, payload);
        } catch (error) {
          logger.error({
            module: "ROOT",
            origin: "NOTIFICATION",
            method: "SEND_NOTIFICATION_USER",
            data: {
              message: `Erro ao enviar notificação para a maquina ${machine.endpoint}`,
              stack: error.stack,
              name: error.name,
            },
          });
        }
      }
      resolve();
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "NOTIFICATION",
        method: "SEND_NOTIFICATION_USER",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

function sendNotificationUsers(req) {
  return new Promise(async (resolve, reject) => {
    const { title, message } = req.body;

    let conn;
    try {
      conn = await db.getConnection();
      const [machines] = await conn.execute("SELECT endpoint, public_key, auth FROM user_maquinas");
      if (!machines.length) {
        throw new Error("Nenhum usuário encontrado");
      }

      //* Envia a notificação para todos os dispositivos registrados no banco de dados
      for (const machine of machines) {
        try {
          const subscription = {
            endpoint: machine.endpoint,
            expirationTime: null,
            keys: {
              p256dh: machine.public_key,
              auth: machine.auth,
            },
          };
          const payload = JSON.stringify({
            title,
            body: message,
          });
          await WebPush.sendNotification(subscription, payload);
        } catch (error) {
          logger.error({
            module: "ROOT",
            origin: "NOTIFICATION",
            method: "SEND_NOTIFICATION_USER",
            data: {
              message: `Erro ao enviar notificação para a maquina ${machine.endpoint}`,
              stack: error.stack,
              name: error.name,
            },
          });
        }
      }
      resolve();
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "NOTIFICATION",
        method: "SEND_NOTIFICATION_USERS",
        data: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
}

module.exports = {
  registerUserMachine,
  sendNotificationUser,
  sendNotificationUsers,
};
