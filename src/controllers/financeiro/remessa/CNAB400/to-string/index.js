const rulesItau = require("../bancos/itau/rules");
const rulesBradesco = require("../bancos/bradesco/rules");
const { normalizeValue, removeSpecialCharactersAndAccents } = require("./masks");

function rulesBanco(cod_banco) {
  if (cod_banco == 341) {
    return rulesItau;
  }
  if (cod_banco == 237) {
    return rulesBradesco;
  }
}
function createHeaderArquivo(params) {
  let rules = rulesBanco(params.codigo_banco);
  if (!rules) {
    throw new Error("Banco não suportado!");
  }
  const headerModel = rules.arquivoHeader;

  return headerModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} do header do arquivo é obrigatório!`);
      }
      if (params[h.field]) {
        return h.field === "empresa_nome"
          ? normalizeValue(
              removeSpecialCharactersAndAccents(params[h.field]).replace("  ", " "),
              h.type,
              h.length
            )
          : normalizeValue(params[h.field], h.type, h.length);
      }
      return normalizeValue(h.default, h.type, h.length);
    })
    .join("");
}

function createDetalheArquivo(params) {
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules.detalhe;
  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} do detalhe do arquivo é obrigatório!`);
      }
      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}
function createTrailerArquivo(params) {
  let rules = rulesBanco(params.codigo_banco);
  const trailerModel = rules.arquivoTrailer;
  return trailerModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} do trailer do arquivo é obrigatório!`);
      }
      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length);
      }
      return normalizeValue(h.default, h.type, h.length);
    })
    .join("");
}

module.exports = {
  createHeaderArquivo,
  createDetalheArquivo,
  createTrailerArquivo,
};
