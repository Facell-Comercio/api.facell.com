const { db } = require("../../../../../mysql");
const { logger } = require("../../../../../logger");

module.exports = function geradorDadosEmpresa() {
    return new Promise(async (resolve, reject) => {
      const conn = await db.getConnection();
  
      try {
        await conn.beginTransaction();
  
        const [rowsFiliais] = await conn.execute(
          `
          SELECT
            id, cnpj
          FROM filiais 
        `
        );
        for (const filial of rowsFiliais) {
          await fetch(`https://receitaws.com.br/v1/cnpj/${filial.cnpj}`)
            .then((res) => res.json())
            .then(async (data) => {
              // console.log("FILIAL - ", filial.id, " - OK");
  
              await conn.execute(
                `
                UPDATE filiais SET logradouro = ?, numero = ?, complemento = ?, cep = ?, email = ? WHERE id = ?
                `,
                [
                  data.logradouro,
                  data.numero,
                  data.complemento,
                  data.cep.split("/")[0].replace(/\D/g, ""),
                  data.email,
                  filial.id,
                ]
              );
            })
            .catch((error) => {
              logger.error({
                module: "FINANCEIRO",
                origin: "BORDERO",
                method: "CONSULTA_CNPJ_BORDEROS",
                data: {
                  message: error.message,
                  stack: error.stack,
                  name: error.name,
                },
              });
              reject(error);
            });
          await new Promise((resolve) => setTimeout(resolve, 20000));
          // console.log("20 seconds have passed!");
        }
  
        await conn.commit();
        resolve();
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "BORDERO",
          method: "GERADOR_DADOS_EMPRESA",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
        reject(error);
      } finally {
        conn.release();
      }
    });
  }