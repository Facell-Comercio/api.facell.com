const { db } = require("../../../mysql");
const fs = require("fs");
const readline = require("readline");
const path = require("path");
const { formatDate } = require("date-fns");
const { logger } = require("../../../logger");
const { pid } = require("process");

const baseDir = process.cwd();
const filePaths = {
  50: path.join(baseDir, "logs", "error.log"),
  40: path.join(baseDir, "logs", "warn.log"),
  30: path.join(baseDir, "logs", "info.log"),
};
function getAll(req) {
  return new Promise(async (resolve, reject) => {
    try {
      const { type } = req.query;
      // Função para ler um arquivo linha por linha e armazenar em um array
      function readFileLines(filePath, type) {
        return new Promise((resolve, reject) => {
          const lines = [];
          const rl = readline.createInterface({
            input: fs.createReadStream(filePath),
            output: process.stdout,
            terminal: false,
          });

          rl.on("line", (line) => {
            try {
              const parsedLine = JSON.parse(line);
              const formattedDate = new Date(parsedLine.time);
              lines.push({
                ...parsedLine,
                id: `${parsedLine.time}${type}`,
                date: formattedDate,
              });
            } catch (err) {
              console.error("ERRO_JSON_PARSE", err);
              reject(err);
            }
          });

          rl.on("close", () => {
            resolve(
              lines.sort(function (a, b) {
                if (a.time < b.time) {
                  return 1;
                }
                if (a.time > b.time) {
                  return -1;
                }
                // a must be equal to b
                return 0;
              })
            );
          });

          rl.on("error", (err) => {
            console.log(err);
            reject(err);
          });
        });
      }

      const result = readFileLines(filePaths[type], type);

      resolve(result);
    } catch (error) {
      console.error("ERRO_GET_ALL_LOGS", error);
      reject(error);
    }
  });
}

// function getOne(req) {
//   return new Promise(async (resolve, reject) => {
//     const { pid } = req.params;
//     const type = pid.slice(-2);
//     try {
//       function findLineByPid(filePath, type, pid) {
//         return new Promise((resolve, reject) => {
//           const rl = readline.createInterface({
//             input: fs.createReadStream(filePath),
//             output: process.stdout,
//             terminal: false,
//           });

//           rl.on("line", (line) => {
//             try {
//               const parsedLine = JSON.parse(line);
//               if (`${parsedLine.time}${type}` === pid) {
//                 const formattedDate = new Date(parsedLine.time);
//                 resolve({ type, ...parsedLine, time: formattedDate });
//                 rl.close(); // Encerra a leitura assim que a linha é encontrada
//               }
//             } catch (err) {
//               reject();
//             }
//           });

//           rl.on("close", () => {
//             resolve(lines);
//           });

//           rl.on("error", (err) => {
//             reject(err);
//           });
//         });
//       }
//       resolve(findLineByPid(filePaths[type], type, pid));
//       return;
//     } catch (error) {
//       console.error("ERRO_GET_ONE_USERS", error);
//       reject(error);
//       return;
//     }
//   });
// }

module.exports = {
  getAll,
};
