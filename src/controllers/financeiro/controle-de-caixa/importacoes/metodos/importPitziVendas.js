const XLSX = require("xlsx");
const fs = require("fs").promises;
const { logger } = require("../../../../../../logger");
const { db } = require("../../../../../../mysql");
const csvParser = require("csv-parser");

module.exports = async (req) => {
  return new Promise(async (resolve, reject) => {
    let filePath;

    const PITZI_TIPOS_PLANOS = [
      { id: 199, plano: "PITZI TOTAL" },
      { id: 68, plano: "PROTEÇÃO DE TELA" },
      { id: 203, plano: "GARANTIA ESTENDIDA" },
      { id: 71, plano: "PROTEÇÃO PARCIAL" },
      { id: 456, plano: "PITZI CARE" },
    ];

    try {
      const { file } = req;

      // ^ Validações
      if (!file) {
        throw new Error("Falha no upload do arquivo, tente novamente!");
      }
      filePath = file.path;
      const fileBuffer = await fs.readFile(filePath);

      const readableStream = require("stream").Readable.from(fileBuffer);
      const rows = [];
      readableStream
        .pipe(csvParser({ separator: ",", skipLines: 1 }))
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", async () => {
          let conn;
          let i = 0;
          try {
            conn = await db.getConnection();
            conn.config.namedPlaceholders = true;

            for (const row of rows) {
              i++;
              const lojaPitzi = row["Loja"]?.trim();

              const [rowFilial] = await conn.execute(
                `SELECT id FROM filiais WHERE nome_pitzi LIKE CONCAT('%', ? ,'%')`,
                [lojaPitzi]
              );
              const filial = rowFilial && rowFilial[0];
              if (!filial) {
                throw new Error(`Filial não localizada pelo nome_pitzi: ${lojaPitzi}`);
              }
              const id_plano = parseInt(row["ID do Plano"]) || null;
              const tipo_plano = PITZI_TIPOS_PLANOS.find((p) => p.id == row["ID do Plano"]);

              const dataEhora = row["Vendido em"].split(" ");
              const data = dataEhora && dataEhora[0] && dataEhora[0].split("/").reverse().join("-");

              const id_seguro = (row["Order ID"] && parseInt(row["Order ID"])) || null;
              if (!id_seguro) {
                throw new Error(`Order ID não informado em linha ${i}`);
              }

              const obj = {
                id_seguro: id_seguro,
                id_plano: id_plano,
                tipo_plano: (tipo_plano && tipo_plano["plano"]) || null,
                id_filial: filial.id,
                loja: lojaPitzi,
                data: data,
                hora: (dataEhora && dataEhora[1]) || null,
                modelo_produto: row["Modelo do aparelho"] || null,
                valor: row["Preço do plano"],
                forma_pagto: row["Forma de Pagamento"]?.substring(0, 150) || "",
                boleto_pago: row["Boleto pago"] || null,
                qtde_parcelas: row["Quantidade de Parcelas"] || null,
                imei: row["IMEI"] || null,
                nome_vendedor: row["Vendedor"]?.substring(0, 100) || null,
                cpf_vendedor: row["CPF do Vendedor"]?.substring(0, 15) || null,
                email_cliente: row["Email do Cliente"]?.substring(0, 120) || null,
                telefone_cliente: row["Telefone do Cliente"]?.substring(0, 15) || null,
                nome_cliente:
                  row[
                    "translation missing: pt-BR.reports.partner_manager.store_orders.customer_name"
                  ]?.substring(0, 150) || null,
                cpf_cliente: row["CPF do Cliente"]?.substring(0, 15) || null,
              };
              // console.log(obj);

              await conn.execute(
                `INSERT IGNORE pitzi_vendas 
                                (
                                    id_seguro,
                                    id_plano,
                                    tipo_plano,
                                    id_filial,
                                    loja,
                                    data,
                                    hora,
                                    modelo_produto,
                                    valor,
                                    nome_vendedor,
                                    forma_pagto,
                                    qtde_parcelas,
                                    boleto_pago,
                                    email_cliente,
                                    telefone_cliente,
                                    nome_cliente,
                                    imei,
                                    cpf_vendedor,
                                    cpf_cliente
            
                                ) VALUES 
                                (
                                    :id_seguro,
                                    :id_plano,
                                    :tipo_plano,
                                    :id_filial,
                                    :loja,
                                    :data,
                                    :hora,
                                    :modelo_produto,
                                    :valor,
                                    :nome_vendedor,
                                    :forma_pagto,
                                    :qtde_parcelas,
                                    :boleto_pago,
                                    :email_cliente,
                                    :telefone_cliente,
                                    :nome_cliente,
                                    :imei,
                                    :cpf_vendedor,
                                    :cpf_cliente
                                )`,
                obj
              );
            }

            // * Insert em log de importações de relatórios:
            await conn.execute(
              `INSERT INTO logs_movimento_arquivos (id_user, relatorio, descricao ) VALUES (:id_user, :relatorio, :descricao)`,
              {
                id_user: req.user.id,
                relatorio: "PITZI-VENDAS",
                descricao: ` ${rows.length} linhas importadas!`,
              }
            );

            await conn.commit();
            resolve(true);
          } catch (error) {
            if (conn) await conn.rollback();
            reject(error);
            throw error;
          } finally {
            if (conn) conn.release();
          }
        })
        .on("error", (err) => {
          throw err;
        });
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "CONFERENCIA_DE_CAIXA",
        method: "IMPORT_PITZI_VENDAS",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
    } finally {
      if (filePath) {
        try {
          await fs.unlink(filePath);
        } catch (err) {}
      }
    }
  });
};
