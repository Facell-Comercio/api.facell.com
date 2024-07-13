const { logger } = require("../../../../../logger");
const changeStatusTitulo = require("./changeStatusTitulo");

module.exports = function changeFieldTitulos(req) {
    return new Promise(async (resolve, reject) => {
      const { type, value, ids } = req.body;
  
      try {
        if (!type) {
          throw new Error("TIPO de alteração não informado!");
        }
        if (!value) {
          throw new Error("VALOR da alteração não informado!");
        }
        if (ids && ids.length <= 0) {
          throw new Error("SOLICITAÇÕES a serem alteradas não selecionadas!");
        }
        const result = [];
        for (const id of ids) {
          if (type === "status") {
            try {
              await changeStatusTitulo({
                body: {
                  id_titulo: id,
                  id_novo_status: value,
                },
              });
              result.push({ id: id, resultado: "Alterado", message: "OK" });
            } catch (error) {
              result.push({ id: id, resultado: "Erro", message: error.message });
            }
          }
        }
  
        resolve(result);
      } catch (error) {
        logger.error({
          module: "FINANCEIRO",
          origin: "TITULOS A PAGAR",
          method: "CHANGE_FIELD_TITULOS",
          data: { message: error.message, stack: error.stack, name: error.name },
        });
  
        reject(error);
      }
    });
  }