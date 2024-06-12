const { ITAU } = require("../layout/rules");
const {
  normalizeValue,
  removeSpecialCharactersAndAccents,
} = require("./masks");

function createHeaderArquivo(params) {
  const headerModel = ITAU.ArquivoHeader;
  return headerModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} do header do arquivo é obrigatório!`
        );
      }
      if (params[h.field]) {
        return h.field === "empresa_nome"
          ? normalizeValue(
              removeSpecialCharactersAndAccents(params[h.field]).replace(
                "  ",
                " "
              ),
              h.type,
              h.length
            )
          : normalizeValue(params[h.field], h.type, h.length);
      }
      return normalizeValue(h.default, h.type, h.length);
    })
    .join("");
}

function createHeaderLote(params) {
  const headerModel = ITAU.Pagamento.LoteHeader;

  return headerModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} do lote ${params.lote} é obrigatório!`
        );
      }
      if (params[h.field]) {
        return h.field === "empresa_nome"
          ? normalizeValue(
              removeSpecialCharactersAndAccents(params[h.field]).replace(
                "  ",
                " "
              ),
              h.type,
              h.length
            )
          : normalizeValue(params[h.field], h.type, h.length);
      }
      return normalizeValue(h.default, h.type, h.length);
    })
    .join("");
}

function createSegmentoA(params) {
  const segmentoModel = ITAU.Pagamento.Detail.A;

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} do vencimento ${params.vencimento} é obrigatório no segmento A!`
        );
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoB(params) {
  const segmentoModel = ITAU.Pagamento.Detail.B;

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} do vencimento ${params.vencimento} é obrigatório no segmento B!`
        );
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createTrailerLote(params) {
  const trailerModel = ITAU.Pagamento.LoteTrailing;

  return trailerModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} do trailer do lote é obrigatório!`);
      }
      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length);
      }
      return normalizeValue(h.default, h.type, h.length);
    })
    .join("");
}

function createTrailerArquivo(params) {
  const trailerModel = ITAU.ArquivoTrailing;
  return trailerModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} do trailer do arquivo é obrigatório!`
        );
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
  createHeaderLote,
  createSegmentoA,
  createSegmentoB,
  createTrailerLote,
  createTrailerArquivo,
};
