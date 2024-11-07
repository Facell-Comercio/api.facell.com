const { db } = require("../../../../../../mysql");
const { logger } = require("../../../../../../logger");
const { importFromExcel } = require("../../../../../helpers/lerXML");

module.exports = async (req, res) => {
  return new Promise(async (resolve, reject) => {
    const { id_campanha } = req.body;

    let conn;

    try {
      conn = await db.getConnection();
      await conn.beginTransaction();
      console.log(id_campanha);

      const files = req.files;

      for (const file of files) {
        const excelFileList = importFromExcel(file?.path);
        console.log("INICIOU");
        console.time("Tempo total da importação");
        console.time("Tempo da consulta");

        let totalClientes = excelFileList.length;

        console.log("CONSULTOU");
        console.timeEnd("Tempo da consulta");
        const arrayClientes = [];
        const maxLength = 10000;

        let totalInseridos = 1;

        for (const cliente of excelFileList) {
          if (cliente.gsm === null) {
            cliente.gsm = "";
          }
          if (cliente.subgrupo === null) {
            cliente.subgrupo = "";
          }
          //*
          arrayClientes.push(`
          (
            ${db.escape(cliente.cliente)},
            ${db.escape(cliente.gsm)},
            ${db.escape(cliente.gsm_portado)},
            ${db.escape(cliente.cpf_cliente)},
            ${db.escape(cliente.data_ultima_compra)},
            ${db.escape(cliente.plano_habilitado)},
            ${db.escape(cliente.produto_ultima_compra)},
            ${db.escape(cliente.desconto_plano)},
            ${db.escape(cliente.valor_caixa)},
            ${db.escape(cliente.uf)},
            ${db.escape(cliente.filial)},
            ${db.escape(cliente.fidelizacao1)},
            ${db.escape(cliente.fidelizacao2)},
            ${db.escape(cliente.fidelizacao3)},
            ${db.escape(cliente.tim_data_consulta)},
            ${db.escape(cliente.plano_atual)},
            ${db.escape(cliente.status_plano)},
            ${db.escape(id_campanha)}
          )
        `);

          if (arrayClientes.length === maxLength || totalClientes === 1) {
            const queryInsert = `
              INSERT IGNORE INTO marketing_mailing_clientes
              (
                cliente,
                gsm,
                gsm_portado,
                cpf,
                data_ultima_compra,
                plano_habilitado,
                produto_ultima_compra,
                desconto_plano,
                valor_caixa,
                uf,
                filial,
                fidelizacao1,
                fidelizacao2,
                fidelizacao3,
                tim_data_consulta,
                plano_atual,
                status_plano,
                id_campanha
              )
                VAlUES
                ${arrayClientes.join(",")}
              `;
            await conn.execute(queryInsert);
            arrayClientes.length = 0;
            console.log(`${totalInseridos}/${excelFileList.length}`);
            console.timeEnd("Tempo do lote");
            console.time("Tempo do lote");
          }

          totalInseridos++;
          totalClientes--;
        }
      }

      console.timeEnd("Tempo total da importação");

      await conn.commit();
      resolve({ message: "Success" });
    } catch (error) {
      logger.error({
        module: "MARKETING",
        origin: "MAILING",
        method: "IMPORT_CLIENTES_EXCEL",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      if (conn) await conn.rollback();
      reject(error);
    } finally {
      if (conn) conn.release();
    }
  });
};
