const rules = require("../layout/rules");
const { normalizeValue, removeSpecialCharactersAndAccents } = require("./masks");

function createHeaderArquivo(params) {
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
