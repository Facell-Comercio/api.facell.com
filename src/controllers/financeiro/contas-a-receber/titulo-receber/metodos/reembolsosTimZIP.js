const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const fs = require("fs/promises");
const JSZip = require("jszip");
const pdf = require("pdf-parse");
const {
  removeSpecialCharactersAndAccents,
  normalizeFirstAndLastName,
} = require("../../../../../helpers/mask");
const { uploadFileBuffer } = require("../../../../storage-controller");
const { startOfDay, formatDate, addDays, parse, isValid } = require("date-fns");

// Função para remover acentos
const removeAccents = (str) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

// Função para limpar e formatar chaves
const formatKey = (key) => {
  return removeAccents(key)
    .replace(/[^a-zA-Z0-9_ ]/g, "") // Remove caracteres especiais
    .replace(/\s+/g, "_") // Substitui espaços por sublinhados
    .toLowerCase(); // Transforma em minúsculas
};

// Função para transformar a string em um objeto
const parseReceiptString = (str) => {
  const lines = str.trim().split("\n");
  const receiptObject = {};

  for (const line of lines) {
    // Tratamento especial para a linha "RECIBO Nº 1290043"
    if (line.toLowerCase().startsWith("recibo")) {
      const match = line.match(/recibo.*?(\d+)/i); // Captura o número do recibo
      if (match) {
        receiptObject["recibo"] = match[1]; // Adiciona o número do recibo ao objeto
      }
      continue; // Pula para a próxima linha
    }

    // Usando regex para capturar chave e valor
    const match = line.match(/(.*?):\s*(.*)/);
    if (match) {
      const key = formatKey(match[1].trim()); // Chave formatada
      const value = match[2].trim(); // Valor (após os dois pontos)
      receiptObject[key] = value;
    } else {
      // Para linhas sem um par chave-valor
      receiptObject["observations"] = (receiptObject["observations"] || "") + line.trim() + " ";
    }
  }

  // Remover espaços extras no campo 'observations'
  if (receiptObject["observations"]) {
    receiptObject["observations"] = receiptObject["observations"].trim();
  }

  return receiptObject;
};

module.exports = async = (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;

    try {
      conn = await db.getConnection();
      const { user } = req;

      await conn.beginTransaction();

      const files = req.files;

      if (!files || !files.length) {
        throw new Error("Arquivos não recebidos!");
      }
      const retorno = [];

      let qtde_emissoes = 0;
      //* PASSANDO EM TODOS OS ARQUIVOS
      for (const file of files) {
        const filePath = file?.path;
        const originalName = Buffer.from(file.originalname, "latin1").toString("utf8");
        let obj = {
          arquivo: originalName,
        };

        try {
          const zipBuffer = fs.readFile(filePath);
          // Carrega o conteúdo do arquivo ZIP usando o JSZip
          const zip = await JSZip.loadAsync(zipBuffer);

          // Coletar os arquivos dentro do ZIP em uma array
          const filesZip = Object.values(zip.files);

          if (filesZip.length < 1) {
            throw new Error("Arquivo ZIP sem conteúdo!");
          }

          //* PASSANDO EM TODOS OS ARQUIVOS DO ZIP
          for (const zipFile of filesZip) {
            if (!zipFile.dir && zipFile.name.endsWith(".pdf")) {
              // Lê o conteúdo do PDF como Buffer
              const pdfBuffer = await zipFile.async("nodebuffer");

              // Usar pdf-parse para extrair o texto do PDF
              await pdf(pdfBuffer)
                .then(async (data) => {
                  try {
                    // Objeto de retorno do PDF
                    const pdfObj = parseReceiptString(data.text);
                    if (!pdfObj.pedido_de_compra) {
                      throw new Error("Formato do recibo não suportado!");
                    }

                    // Consulta o título com o pedido sap do PDF
                    const [rowTitulo] = await conn.execute(
                      "SELECT id, id_status, url_recibo FROM fin_cr_titulos WHERE tim_pedido_sap = ?",
                      [pdfObj.pedido_de_compra]
                    );
                    const titulo = rowTitulo && rowTitulo[0];
                    const dataEmissao = parse(pdfObj.data_emissao, "dd/MM/yyyy", new Date());
                    const data_vencimento = addDays(dataEmissao, 30);

                    // Cria o objeto de retorno para esse arquivo
                    obj = {
                      ...obj,
                      id_titulo: titulo.id,
                      tim_pedido_sap: pdfObj.pedido_de_compra,
                      nome_arquivo: zipFile.name,
                      url_arquivo: titulo.url_recibo,
                      data_emissao: formatDate(dataEmissao, "dd/MM/yyyy"),
                      data_vencimento: formatDate(data_vencimento, "dd/MM/yyyy"),
                    };

                    if (!titulo) {
                      throw new Error(
                        `Título não encontrado para o pedido de compra ${pdfObj.pedido_de_compra}`
                      );
                    }
                    // Verifica se o título já foi emitido
                    if (parseInt(titulo.id_status) > 10) {
                      throw new Error("TÍTULO JÁ EMITIDO");
                    }

                    // Verifica se a data de emissão é válida
                    if (!isValid(dataEmissao)) {
                      throw new Error(`DATA DE EMISSÃO INVÁLIDA (${pdfObj.data_emissao})`);
                    }

                    // Persiste o arquivo pdf e retorna a url dele
                    const { fileUrl } = await uploadFileBuffer({
                      file: {
                        buffer: pdfBuffer,
                        mimetype: "application/pdf",
                        filename: zipFile.name,
                      },
                      body: { folderName: "financeiro" },
                    });

                    // Atualiza o status do título para "Emitido" e adiciona a URL do recibo
                    await conn.execute(
                      "UPDATE fin_cr_titulos SET url_recibo = ?, num_doc = ?, id_status = 30, data_emissao = ? WHERE id = ?",
                      [fileUrl, pdfObj.pedido_de_compra, dataEmissao, titulo.id]
                    );

                    // Atualiza a data de vencimento dos vencimentos do título
                    await conn.execute(
                      "UPDATE fin_cr_titulos_vencimentos SET data_vencimento = ? WHERE id_titulo = ?",
                      [data_vencimento, titulo.id]
                    );

                    // Adiciona um histórico de emissão ao título
                    const historico = `EMITIDO POR: ${normalizeFirstAndLastName(user.name)}.`;
                    await conn.execute(
                      `INSERT INTO fin_cr_titulos_historico(id_titulo, descricao) VALUES(?, ?)`,
                      [titulo.id, historico]
                    );

                    qtde_emissoes++;

                    obj = {
                      ...obj,
                      status_importacao: "OK",
                      observação: "ATUALIZAÇÃO REALIZADA COM SUCESSO",
                    };
                    retorno.push(obj);
                  } catch (erro) {
                    obj = {
                      ...obj,
                      status_importacao: "ERRO",
                      observação: String(erro.message).toUpperCase(),
                    };
                    retorno.push(obj);
                  }
                })
                .catch(() => {
                  obj = {
                    ...obj,
                    status_importacao: "ERRO",
                    observação: String(`Erro ao ler o PDF ${zipFile.name}`).toUpperCase(),
                  };
                  retorno.push(obj);
                });
            }
          }
        } catch (erro) {
          const message = String(erro.message).toUpperCase();
          obj = {
            ...obj,
            status_importacao: "ERRO",
            observação: message,
          };
          retorno.push(obj);
        }
      }

      // * Insert em log de importações de relatórios:
      if (qtde_emissoes > 0) {
        await conn.execute(
          `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (?,?,?)`,
          [user.id, "IMPORT_REEMBOLSOS_TIM_ZIP", `Foram emitidos ${qtde_emissoes} reembolsos!`]
        );
      }

      await conn.commit();
      resolve(retorno);
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "TITULOS_A_RECEBER",
        method: "REEMBOLSOS_TIM_ZIP",
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
};
