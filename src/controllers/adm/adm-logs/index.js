const fs = require("fs");
const readline = require("readline");
const path = require("path");
const { logger } = require("../../../../logger");

const baseDir = process.cwd();
function getAll() {
  return new Promise(async (resolve, reject) => {
    try {
      // Função para ler um arquivo linha por linha e armazenar em um array
      function readFileLines(filePath) {
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
                message: "",
                ...parsedLine,
                id: `${parsedLine.time}${parsedLine.level}`,
                date: formattedDate,
              });
            } catch (err) {
              // console.log(line);
              // console.log(JSON.parse(line));
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
            // console.log(err);
            reject(err);
          });
        });
      }

      const result = readFileLines(path.join(baseDir, "logs", "info.log")) || [];

      resolve(result);
    } catch (error) {
      logger.error({
        module: "ADM",
        origin: "LOGGER",
        method: "GET_LOGS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });

      reject(error);
    }
  });
}

module.exports = {
  getAll,
};
