const { unlink } = require("fs/promises");
const path = require("path");
const fs = require("fs");
const JSZip = require("jszip");
const { logger } = require("../../logger");
require("dotenv").config();

async function deleteFile(filePath) {
  try {
    if(!filePath){
      return true;
    }
    await unlink(filePath);
    return true;
  } catch (error) {
    logger.error({
      module: "ROOT",
      origin: "FILES",
      method: "DELETE_FILE",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
    return false;
  }
}

function createUploadsPath(texto) {
  if (!texto) return null;
  const partes = texto.split(/[\\/]/);
  const fileName = partes[partes.length - 1]?.trim();
  if (!fileName) return null;
  return path.join(process.cwd(), "public", "uploads", fileName);
  return path.join(process.cwd(), "public", "uploads", fileName);
}

function zipFiles({ items }) {
  // * Cria um zip com base na estrutura de objeto a seguir:
  // {
  //     items: [
  //       {
  //         type: 'folder',
  //         folderName: 'arquivos',
  //         items: [
  //           {
  //             type: 'folder',
  //             folderName: '01',
  //             items: [
  //               { type:'file', fileName: 'IMG Alex.jpg', filePath: createUploadsPath('eu_n7gr6lo82xvjv7cxaq417nje.jpg') },
  //               { type:'file', fileName: 'IMG Leandro.png', filePath: createUploadsPath('Leandro_mx77q4c8372vfyf5vmx9qdp7.png') },
  //             ]
  //           },
  //           {
  //             type: 'folder',
  //             folderName: '02',
  //             items: [
  //               { type:'file', fileName: 'BOLETO 102030.pdf', filePath: createUploadsPath('NOTAS_-_Manual_Tecnico_SISPAG__kqx5ixqs9oq3k1bzwmmlqa0k.pdf') },
  //               { type:'file', fileName: 'BOLETO 111213.pdf', filePath: createUploadsPath('Parcial 04-04 17_iwptugddgzbrljwretm1aje2.pdf') },
  //             ]
  //           },

  //         ]
  //       },
  //       {
  //         type: 'file', fileName: 'Relatório.xlsx', filePath: createUploadsPath('rateio-novo-titulo_ap7iu8h7ns4uaw296q9kfcyj.xlsx')
  //       }
  //     ]
  //   }
  return new Promise(async (resolve, reject) => {
    try {
      const zip = new JSZip();

      async function addItemsToZip(items, parentPath = "") {
        for (const item of items) {
          if (item.type === "folder") {
            const folderPath = parentPath
              ? `${parentPath}/${item.folderName}`
              : item.folderName;
            await addItemsToZip(item.items, folderPath);
            continue;
          }
          if (item.type === "file") {
            try {
              const content = fs.readFileSync(item.content);
              const filePath = parentPath
                ? `${parentPath}/${item.fileName}`
                : item.fileName;
              zip.file(filePath, content);
            } catch (e) {}
            continue;
          }
          if (item.type === "buffer") {
            try {
              const filePath = parentPath
                ? `${parentPath}/${item.fileName}`
                : item.fileName;
              zip.file(filePath, item.content);
            } catch (e) {}
            continue;
          }
        }
      }
      await addItemsToZip(items);

      zip
        .generateAsync({ type: "nodebuffer" })
        .then((content) => {
          resolve(content);
        })
        .catch((error) => {
          reject("ERROR_ZIP_FILES", error);
        });
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "FILES",
        method: "ZIP_FILES",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
      return;
    }
  });
}

async function clearTempFolder() {
  try {

    const pathTemp = path.join(process.cwd(), "public", "temp");
    fs.readdir(pathTemp, (err, arquivos) => {
      if (err) {
        console.error("Erro ao ler o diretório:", err);
        return;
      }

      arquivos.forEach((arquivo) => {
        const caminhoArquivo = path.join(pathTemp, arquivo);

        fs.unlink(caminhoArquivo, (error) => {
          if (error) {
            logger.error({
              module: "ROOT",
              origin: "FILES",
              method: "CLEAR_TEMP_FOLDER_DELETE_FILE",
              data: {
                message: error.message,
                stack: error.stack,
                name: error.name,
              },
            });
            return;
          }
        });
      });
    });
    logger.info({
      module: "ROOT",
      origin: "FILES",
      method: "CLEAR_TEMP_FOLDER",
      data: { message: "Limpeza realizada" },
    });
  } catch (error) {
    logger.error({
      module: "ROOT",
      origin: "FILES",
      method: "CLEAR_TEMP_FOLDER",
      data: { message: error.message, stack: error.stack, name: error.name },
    });
  }
}

function moveFile(origem, destino) {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo de origem existe
    if (!fs.existsSync(origem)) {
      reject(new Error("O arquivo de origem não existe."));
      return;
    }

    // Mover o arquivo
    fs.rename(origem, destino, (error) => {
      if (error) {
        logger.error({
          module: "ROOT",
          origin: "FILES",
          method: "MOVE_FILE",
          data: {
            message: error.message,
            stack: error.stack,
            name: error.name,
          },
        });
        reject(err); // Rejeitar a Promise se houver um erro
        return;
      }
      resolve(); // Resolver a Promise se o arquivo for movido com sucesso
    });
  });
}

function urlContemTemp(url) {
  return url.includes("/temp/");
}

/**
 * Move um arquivo que esteja na pasta Temp para a pasta Uploads
 * */
function moverArquivoTempParaUploads(url) {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve("");
    }
    if (urlContemTemp(url)) {
      const nomeArquivo = url.split("/").pop(); // Captura o nome do arquivo da URL
      const origem = path.join(
        process.cwd(),
        process.cwd(),
        "public",
        "temp",
        nomeArquivo
      );
      const destino = path.join(
        process.cwd(),
        process.cwd(),
        "public",
        "uploads",
        nomeArquivo
      );
      const novaUrl = `${process.env.BASE_URL}/uploads/${nomeArquivo}`;

      // Move o arquivo da pasta temp para a pasta uploads
      if (fs.existsSync(destino)) {
        resolve(novaUrl);
      }
      fs.rename(origem, destino, (error) => {
        if (error) {
          logger.error({
            module: "ROOT",
            origin: "FILES",
            method: "MOVER_TEMP_PARA_UPLOADS",
            data: {
              message: error.message,
              stack: error.stack,
              name: error.name,
            },
          });
          resolve("");
        } else {
          resolve(novaUrl);
        }
      });
    } else {
      resolve(url);
    }
  });
}

/**
 * Sustitui um arquivo anterior por um novo
 * @returns {Promise<String|null>}
 * Basta passar a antiga URL que o arquivo será excluído
 * E passar a nova URL (provavelmente /temp ), será persistido em uploads
 * */
function replaceFileUrl({ oldFileUrl, newFileUrl }) {
  return new Promise(async (resolve, reject) => {
    try {
      await deleteFile(oldFileUrl);
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "FILES",
        method: "REPLACE_FILE_URL:DELETE_OLD_FILE",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      const url = await moverArquivoTempParaUploads(newFileUrl);
      resolve(url);
    }
  });
}

function createFilePathFromUrl(url) {
  return new Promise(async (resolve, reject) => {
    try {
      if (!url || typeof url !== "string") {
        resolve(null);
        return;
      }
      const isTemp = url.includes("temp/");

      const partes = isTemp ? url.split("temp/") : url.split("uploads/");
      const fileName = partes[1];

      const newPath = isTemp
        ? path.join(process.cwd(), "public", "temp", fileName)
        : path.join(process.cwd(), "public", "uploads", fileName);

      resolve(newPath);
    } catch (error) {
      logger.error({
        module: "ROOT",
        origin: "FILES",
        method: "CREATE_FILE_PATH_FROM_URL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
}

module.exports = {
  deleteFile,
  clearTempFolder,
  moveFile,
  urlContemTemp,
  moverArquivoTempParaUploads,
  createFilePathFromUrl,
  createUploadsPath,
  zipFiles,
  replaceFileUrl,
};
