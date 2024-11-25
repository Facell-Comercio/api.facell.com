const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { importFromExcel } = require("../../../../../helpers/lerXML");
const { excelDateToJSDate } = require("../../../../../helpers/mask");

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { id_campanha } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const files = req.files;

      const qtde_files = files.length;
      let cont_files = 1;
      for (const file of files) {
        const excelFileList = importFromExcel(file?.path);
        const total = excelFileList.length;
        let cont = 1;

        for (const cliente of excelFileList) {
          const queryInsert = `
              UPDATE marketing_mailing_clientes
              SET data_ultima_compra = ? WHERE
              gsm = ?
              AND cpf = ?
              AND uf = ?
              `;
          await conn.execute(queryInsert, [
            excelDateToJSDate(cliente.data_ultima_compra),
            cliente.gsm,
            cliente.cpf_cliente,
            cliente.uf,
          ]);
          console.log(`Contagem: ${cont}/${total} (${cont_files}/${qtde_files})`);
          cont++;
        }
        cont_files++;
        console.log(`Arquivo ${file.originalname} atualizado com sucesso.`);
      }

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "UPDATE_CLIENTES_EXCEL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
