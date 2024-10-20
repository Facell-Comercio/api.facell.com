const xml2js = require("xml2js");
const fs = require("fs");
const { format } = require("date-fns");
const XLSX = require("xlsx");
require("dotenv").config();

async function lerXML(pathXML) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!pathXML) {
        reject("Caminho do OFX não enviado!");
        return;
      }
      const xmlString = await readXML(pathXML);

      if (typeof xmlString !== "string") {
        throw new Error("Não consegui ler o arquivo!");
      }
      xml2js.parseString(xmlString, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
      return;
    } catch (error) {
      reject(error);
    }
  });
}

async function readXML(caminho) {
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

// Função para ajustar cabeçalhos e remover espaços
function trimHeaders(ws) {
  if (!ws || !ws["!ref"]) return;
  const ref = XLSX.utils.decode_range(ws["!ref"]);
  for (let C = ref.s.c; C <= ref.e.c; ++C) {
    const cell = ws[XLSX.utils.encode_cell({ r: ref.s.r, c: C })];
    if (cell && cell.t === "s") {
      cell.v = cell.v.trim();
      if (cell.w) cell.w = cell.w.trim();
    }
  }
}

// Função para processar o arquivo xlsx
function importFromExcel(filePath) {
  // Ler o arquivo
  const workbook = XLSX.readFile(filePath);

  // Selecionar a primeira planilha
  const worksheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[worksheetName];

  // Aplicar trim nos cabeçalhos
  trimHeaders(worksheet);

  // Converter os dados da planilha em um array de objetos
  return XLSX.utils.sheet_to_json(worksheet);
}

module.exports = {
  lerXML,
  importFromExcel,
};
