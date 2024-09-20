const { logger } = require("../../../../../../logger");
const rules = require("../layout/rules");
const { checkTipoRegistroRemessa, transformStringToObject } = require("./util");

const remessaToObject = (txt) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!txt) {
        throw new Error("Arquivo de texto não recebidos por parâmetro!");
      }
      const codigo_banco = txt.substring(76, 79);

      const banco = rules.bancosValidos.find((banco) => banco.codigo == codigo_banco);
      if (!banco) {
        throw new Error(
          `A aplicação não está programada para lidar com o banco ${codigo_banco}. Procure a equipe de desenvolvimento`
        );
      }
      const layoutArquivoHeader = rules[banco.nome].arquivoHeader;
      const layoutArquivoTrailer = rules[banco.nome].arquivoTrailer;

      const layoutDetathe = rules.ITAU.retorno;

      const result = {
        arquivoHeader: {},
        arquivoDetalhe: [],
        arquivoTrailer: {},
      };
      const linhas = txt.split("\n");
      let detalhe = 0;
      for (const linha of linhas) {
        if (linha) {
          const tipo_registro = checkTipoRegistroRemessa(linha);

          if (tipo_registro == 0) {
            result.arquivoHeader = transformStringToObject(layoutArquivoHeader, linha);
          }
          if (tipo_registro == 9) {
            result.arquivoTrailer = transformStringToObject(layoutArquivoTrailer, linha);
          }
          if (tipo_registro == 1) {
            const obj = transformStringToObject(layoutDetathe, linha);
            result.arquivoDetalhe.push(obj);
            detalhe++;
          }
        }
      }

      resolve(result);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "REMESSA_BOLETO",
        method: "TO_OBJECT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};

module.exports = {
  remessaToObject,
};
