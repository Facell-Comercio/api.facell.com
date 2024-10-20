const XLSX = require("xlsx");
const fs = require("fs").promises;
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const { normalizeNumberOnly } = require("../../../../../helpers/mask");
module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let conn;
    let filePath;
    try {
      const { file } = req;

      // ^ Validações
      if (!file) {
        throw new Error("Falha no upload do arquivo, tente novamente!");
      }
      filePath = file.path;
      const fileBuffer = await fs.readFile(filePath);
      const workbook = XLSX.read(fileBuffer, { type: "buffer" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet);

      if (!rows) {
        throw new Error("Arquivo vazio!");
      }

      conn = await db.getConnection();
      conn.config.namedPlaceholders = true;
      let i = 1;
      for (const row of rows) {
        const id_venda = row["Compra"] || null;
        if (!id_venda) {
          throw new Error(`ID Venda não identificado: ${id_venda}`);
        }
        const cnpj = normalizeNumberOnly(row["CNPJ"]);
        const [rowFilial] = await conn.execute(`SELECT id FROM filiais WHERE cnpj = :cnpj `, {
          cnpj: cnpj,
        });
        const filial = rowFilial && rowFilial[0];
        if (!filial) {
          throw new Error(`Filial não localizada pelo CNPJ: ${cnpj}`);
        }

        const dataHora = row["Data"].split(" ");
        const dataVenda = dataHora && dataHora[0] && dataHora[0].split("-").reverse().join("-");
        if (!dataVenda) {
          throw new Error(`Não identificada a data da venda na linha ${i + 1}`);
        }
        const hora = dataHora[1] || null;

        const obj = {
          id: row["Compra"],
          id_filial: filial.id,
          data: dataVenda,
          hora: hora,
          usuario: row["Usuario"],
          sistema: row["Sistema"],
          custo: row["Custo"],
          valor: row["Face"],
          serie_pin: row["Série PIN"],
          gsm: (row["Fone"] && row["Fone"].replace("-", "")) || null,
          status: row["Status Transação"],
          serie_terminal: row["Série Terminal"],
          nsu_origem: row["Nsu Origem"],
          nsu_referencia: row["Nsu/Referencia"],
        };
        // console.log(obj);

        await conn.execute(
          `INSERT IGNORE fin_vendas_recarga 
                    (
                        id,
                        id_filial,
                        data,
                        hora,
                        usuario,
                        sistema,
                        custo,
                        valor, 
                        serie_pin,
                        gsm,
                        status,
                        serie_terminal,
                        nsu_origem,
                        nsu_referencia

                    ) VALUES 
                    (
                        :id,
                        :id_filial,
                        :data,
                        :hora,
                        :usuario,
                        :sistema,
                        :custo,
                        :valor, 
                        :serie_pin,
                        :gsm,
                        :status,
                        :serie_terminal,
                        :nsu_origem,
                        :nsu_referencia
                    )`,
          obj
        );

        i++;
      }
      // * Insert em log de importações de relatórios:
      await conn.execute(
        `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (:id_user, :relatorio, :descricao)`,
        {
          id_user: req.user.id,
          relatorio: "RECARGA-RVCELLCARD",
          descricao: ` ${rows.length} linhas importadas!`,
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
        method: "IMPORT_RECARGA_RVCELLCARD",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (conn) conn.release();
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (err) {}
      }
    }
  });
};
