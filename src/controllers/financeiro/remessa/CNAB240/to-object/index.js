const { logger } = require("../../../../../../logger");
const rulesItau = require("../bancos/itau/rules");
const rulesBradesco = require("../bancos/bradesco/rules");
const {
  checkTipoRegistroRemessa,
  transformStringToObject,
  checkIsPixByLoteRemessa,
  checkTipoSegmentoDetalhe,
} = require("./util");

const versoesLoteHeader = ["022", "030", "040", "012", "045"];
const bancosValidos = [341, 237];
const remessaToObject = (txt, tipo_retorno = "pagamento") => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!txt) {
        throw new Error("Arquivo de texto não recebidos por parâmetro!");
      }
      const codigo_banco = txt.substring(0, 3);

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

      const layoutLoteTrailer = rules.loteTrailer;

      const result = {
        arquivoHeader: {},
        lotes: [
          {
            loteHeader: {},
            detalhe: [],
            loteTrailer: {},
          },
        ],
        arquivoTrailer: {},
      };
      const linhas = txt.split("\n");
      let lote = 0;
      let detalhe = 0;
      let isPix = false;
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
            const versaoTxt = linha.substring(13, 16);
            const versao = versoesLoteHeader.includes(versaoTxt) ? versaoTxt : "040";
            const layoutLoteHeader = rules.loteHeader[versao];

            if (lote !== 0) {
              result.lotes.push({
                loteHeader: {},
                detalhe: [],
                loteTrailer: {},
              });
            }
            isPix = checkIsPixByLoteRemessa(linha);
            result.lotes[lote].loteHeader = transformStringToObject(layoutLoteHeader, linha);
          }
          if (tipo_registro == 5) {
            result.lotes[lote].loteTrailer = transformStringToObject(layoutLoteTrailer, linha);
            lote++;
            detalhe = 0;
          }
          if (tipo_registro == 3) {
            const segmento = checkTipoSegmentoDetalhe(linha, isPix);
            const layoutDetalhe = rules["detalhe"][tipo_retorno][segmento];
            if (!layoutDetalhe) {
              continue;
            }
            const obj = transformStringToObject(layoutDetalhe, linha);
            result.lotes[lote].detalhe.push(obj);
          }
        }
      }

      resolve(result);
      return;
    } catch (error) {
      logger.error({
        module: "FINANCEIRO",
        origin: "REMESSA",
        method: "TO-OBJECT",
        data: { message: error.message, stack: error.stack, name: error.name },
      });
      reject(error);
    }
  });
};

module.exports = {
  remessaToObject,
};
