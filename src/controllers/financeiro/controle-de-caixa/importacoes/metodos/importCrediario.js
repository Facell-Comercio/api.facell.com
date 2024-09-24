const XLSX = require("xlsx");
const fs = require("fs").promises;
const { formatDate } = require("date-fns");
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let filePath;
    let conn;
    try {
      const { file } = req;
      const EMPRESA_NOME = "PAYJOY";
      // ^ Validações
      if (!file) {
        throw new Error("Falha no upload do arquivo, tente novamente!");
      }

      filePath = file.path;
      const fileBuffer = await fs.readFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      // Separar o cabeçalho e os dados
      const headers = data[0];

      const formattedData = data.map((row) => {
        let rowData = {};

        Object.keys(headers).forEach((header) => {
          rowData[header.trim()] = row[header];
        });
        return rowData;
      });

      if (!formattedData || formattedData.length === 0) {
        throw new Error("Arquivo vazio!");
      }

      conn = await db.getConnection();
      conn.config.namedPlaceholders = true;

      for (const row of formattedData) {
        const cnpj = row["CNPJ LOJA"].replace(/[^a-zA-Z0-9]/g, "");
        const [rowFilial] = await conn.execute(`SELECT id FROM filiais WHERE cnpj = :cnpj `, {
          cnpj,
        });
        const filial = rowFilial && rowFilial[0];
        if (!filial) {
          throw new Error(`Filial não localizada pelo CNPJ: ${cnpj}`);
        }

        const obj = {
          id_filial: filial.id,
          id_crediario: row["FINANCEORDERID"],
          empresa: EMPRESA_NOME,
          data: row["DAY"].split(" ")[0],
          descricao_produto: row["DEVICE MODEL"] || null,
          imei_produto: row["IMEI"] || null,
          nome_vendedor: row["SALES  CLERK NAME (VENDEDOR)"] || null,
          nome_cliente: row["NAME (CLIENTE)"] || null,
          valor_total:
            row["PURCHASEAMOUNT (TOTAL VEND)"] &&
            parseFloat(String(row["PURCHASEAMOUNT (TOTAL VEND)"])),
          valor_entrada:
            row["DOWNPAYMENT (ENTRADA)"] && parseFloat(String(row["DOWNPAYMENT (ENTRADA)"])),
          valor_crediario:
            row["FINANCEAMOUNT (VALOR DEVIDO PARA D&S POR PAYJOY)"] &&
            parseFloat(String(row["FINANCEAMOUNT (VALOR DEVIDO PARA D&S POR PAYJOY)"])),
        };
        await conn.execute(
          `INSERT IGNORE fin_vendas_crediario
            (
                id_filial,
                id_crediario,
                empresa,
                data,
                descricao_produto,
                imei_produto,
                nome_vendedor,
                nome_cliente,
                valor_total,
                valor_entrada,
                valor_crediario
            ) VALUES
            (
                :id_filial,
                :id_crediario,
                :empresa,
                :data,
                :descricao_produto,
                :imei_produto,
                :nome_vendedor,
                :nome_cliente,
                :valor_total,
                :valor_entrada,
                :valor_crediario
            )
            ON DUPLICATE KEY UPDATE
              id_filial = VALUES(id_filial),
              data = VALUES(data),
              descricao_produto = VALUES(descricao_produto),
              imei_produto = VALUES(imei_produto),
              nome_vendedor = VALUES(nome_vendedor),
              nome_cliente = VALUES(nome_cliente),
              valor_total = VALUES(valor_total),
              valor_entrada = VALUES(valor_entrada),
              valor_crediario = VALUES(valor_crediario)
              `,
          obj
        );
      }

      // * Insert em log de importações de relatórios:
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (:id_user, :relatorio, :descricao)`,
        {
          id_user: req.user.id,
          relatorio: "CREDIARIO",
          descricao: `${formattedData.length} linhas importadas!`,
        }
      );

      const result = true;

      await conn.commit();
      resolve(result);
    } catch (error) {
      if (conn) await conn.rollback();
      reject(error);
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "IMPORT_CREDIARIO",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (err) {}
      }
      if (conn) conn.release();
    }
  });
};
