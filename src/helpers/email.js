require("dotenv").config();

const nodemailer = require("nodemailer");
const { logger } = require("../../logger");
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // Servidor SMTP da KingHost
  port: 465, // Porta SMTP (587 é uma porta comum)
  secure: true, // Use SSL/TLS (não seguro)
  tls: { rejectUnauthorized: false },
  auth: {
    user: process.env.EMAIL_USERNAME, // Seu endereço de email
    pass: process.env.EMAIL_PASSWORD, // Sua senha de email
  },
});
function enviarEmail({ assunto, destinatarios, corpo, anexo }) {
  return new Promise(async (resolve, reject) => {
    const mailOptions = {
      from: "sistema@lojasfacell.com",
      to: destinatarios.join(", "),
      subject: assunto,
      text: corpo,
    };

    // Enviar o e-mail
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger.error({
          module: 'ROOT', origin: 'EMAIL', method: 'ENVIA_EMAIL',
          data: { message: error.message, stack: error.stack, name: error.name }
        })
        reject("Erro ao tentar enviar o email");
        return false;
      }
      resolve("Enviado");
      return true;
    });
  });
}

module.exports = {
  enviarEmail,
};
