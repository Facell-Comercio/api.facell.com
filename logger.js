const pino = require("pino");

const cron = require("node-cron");
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const pretty = require("pino-pretty");
const { subDays } = require("date-fns");
const { formatDate } = require("date-fns/format");

//^ Talvez na primeira vez que for rodar no servidor dê erro, já que não existe o diretório logs
// Cria streams para salvar logs nos arquivos
const pathLogs = path.join(__dirname, "logs", "info.log")
const fileStream = fs.createWriteStream(
  pathLogs,
  { flags: "a", encoding: "utf8" }
);
const prettyStream = pretty(); // Para logar no terminal com formato bonito

// Configura os streams no pino
const streams = [
  { stream: fileStream }, // Stream para logs de info
  { stream: prettyStream }, // Stream para logs no terminal
];

// Cria o logger com os streams configurados
const logger = pino({}, pino.multistream(streams));

// cron.schedule("* * 1 * *", () => {
//   const timestamp30Dias = subDays(new Date(), 30).getTime(); // 30 dias atrás

//   const baseDir = process.cwd();

//   function resetFileLines(filePath, timestamp) {
//     return new Promise((resolve, reject) => {
//       const lines = [];

//       const readStream = fs.createReadStream(filePath, { encoding: "utf8" });
//       const rl = readline.createInterface({
//         input: readStream,
//         terminal: false,
//       });

//       rl.on("line", (line) => {
//         try {
//           const parsedLine = JSON.parse(line);
//           // Adiciona ao array apenas as linhas válidas
//           if (parsedLine.time >= timestamp) {
//             lines.push(line);
//           }
//         } catch (err) {
//           // Linha não é um JSON válido, ignore
//           // console.error(`Erro ao processar linha: ${err.message}`);
//         }
//       });

//       rl.on("close", () => {
//         // Fecha o stream de leitura
//         readStream.close();

//         // Reescreve o arquivo com as linhas filtradas
//         fs.writeFile(filePath, lines.join("\n"), (err) => {
//           if (err) {
//             return reject(err);
//           }
//           resolve();
//         });
//       });

//       rl.on("error", (err) => {
//         reject(err);
//       });

//       readStream.on("error", (err) => {
//         reject(err);
//       });
//     });
//   }

//   resetFileLines(path.join(baseDir, "logs", "info.log"), timestamp30Dias)
//     .then(() => {
//       logger.info({
//         module: "ROOT",
//         origin: "LOGGER",
//         method: "RESET_LOGS",
//         data: { message: 'LOGS RESETADOS' },
//       });
//     })
//     .catch((error) => {
//       logger.error({
//         module: "ROOT",
//         origin: "LOGGER",
//         method: "RESET_LOGS",
//         data: { message: error.message, stack: error.stack, name: error.name },
//       });
//     });
// });

const clearLogs = () => {
  return new Promise(async (resolve, reject) => {
      fs.truncate(pathLogs, 0, (error) => {
        if (error) {
          logger.error({
            module: 'ROOT', origin: 'LOGS', method: 'CLEAR_LOGS',
            data: { message: error.message, stack: error.stack, name: error.name }
          })
          reject(error)
          return;
        }
        resolve({ message: 'Sucesso!' })
      });
  })
}

module.exports = {
  logger,
  clearLogs
};
