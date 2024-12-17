const { logger } = require("../../../../../../logger");
const rulesItau = require("../bancos/itau/rules");
const rulesBradesco = require("../bancos/bradesco/rules");
const { checkTipoRegistroRemessa, transformStringToObject } = require("./util");

const bancosValidos = [341, 237];
const remessaToObject = (txt, codigo_banco) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!txt) {
        throw new Error("Arquivo de texto não recebidos por parâmetro!");
      }

      if (!bancosValidos.includes(parseInt(codigo_banco))) {
        throw new Error(
          `A aplicação não está programada para lidar com o banco ${codigo_banco}. Procure a equipe de desenvolvimento`
        );
      }

      let rules;
      if (codigo_banco == 341) {
        rules = rulesItau;
      }
      if (codigo_banco == 237) {
        rules = rulesBradesco;
      }
      const layoutArquivoHeader = rules.arquivoHeader;
      const layoutArquivoTrailer = rules.arquivoTrailer;

      const layoutDetathe = rules.retorno;

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
