const { ITAU } = require("../layout/rules");
const {
  normalizeValue,
  removeSpecialCharactersAndAccents,
} = require("./masks");

function createHeaderArquivo(params) {
  const headerModel = ITAU.arquivoHeader;

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

function createHeaderLote(params, versao = "040") {
  const headerModel = ITAU.loteHeader[versao];
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
  const segmentoModel = ITAU.detalhe.A;
  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento A!`);
      }

      if (params[h.field]) {
        // console.log("A ", params[h.field], h.type, h.length, h.format);

        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoB(params) {
  const segmentoModel = ITAU.detalhe.B;

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento B!`);
      }

      if (params[h.field]) {
        // console.log("B ", params[h.field], h.type, h.length, h.format);
        return normalizeValue(
          params[h.field],
          h.type,
          h.length,
          h.format,
          h.allowedCharacter
        );
      }
      return normalizeValue(
        h.default,
        h.type,
        h.length,
        h.format,
        h.allowedCharacter
      );
    })
    .join("");
}

function createSegmentoO(params) {
  const segmentoModel = ITAU.detalhe.O;

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento O!`);
      }

      if (params[h.field]) {
        // console.log("B ", params[h.field], h.type, h.length, h.format);
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoJ(params) {
  const segmentoModel = ITAU.detalhe.J;
  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento J!`);
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoJ52(params) {
  const segmentoModel = ITAU.detalhe["J-52"];

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento J-52!`);
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoJ52Pix(params) {
  const segmentoModel = ITAU.detalhe["J-52-PIX"];

  return segmentoModel
    .map((h) => {
      if (
        h.required &&
        params[h.field] === undefined &&
        h.default === undefined
      ) {
        throw new Error(
          `O campo ${h.field} é obrigatório no segmento J-52-PIX!`
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
  const trailerModel = ITAU.loteTrailer;

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
  const trailerModel = ITAU.arquivoTrailer;
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
  createSegmentoO,
  createSegmentoJ,
  createSegmentoJ52,
  createSegmentoJ52Pix,
  createTrailerLote,
  createTrailerArquivo,
};
