const fs = require("fs");

async function lerArquivo(caminho) {
  return new Promise((resolve, reject) => {
    fs.readFile(caminho, "utf-8", (err, data) => {
      if (err) {
        reject("Não consegui ler");
      } else {
        resolve(data.replace(/\r\n/g, "\n").replace(/&(?!(?:apos|quot|[gl]t|amp);|#)/g, "&amp;"));
      }
    });
  });
}

module.exports = {
  lerArquivo,
};
