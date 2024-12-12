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

function createHeaderLote(params, versao) {
  let rules = rulesBanco(params.codigo_banco);
  if (!versao) {
    if (params.codigo_banco == 341) versao = "040";
    if (params.codigo_banco == 237) versao = "045";
  }
  const headerModel = rules.loteHeader[versao];
  return headerModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} do lote ${params.lote} é obrigatório!`);
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

function createSegmentoA(params) {
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules.detalhe.pagamento.A;
  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
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

function createSegmentoB(params, versao) {
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModelB = rules.detalhe.pagamento.B;
  const segmentoModelBPix = rules.detalhe?.pagamento["B-PIX"] || {};

  const segmentoModel = versao == "PIX" ? segmentoModelBPix : segmentoModelB;

  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento B!`);
      }

      if (params[h.field]) {
        // console.log("B ", params[h.field], h.type, h.length, h.format);
        return normalizeValue(params[h.field], h.type, h.length, h.format, h.allowedCharacter);
      }
      return normalizeValue(h.default, h.type, h.length, h.format, h.allowedCharacter);
    })
    .join("");
}

function createSegmentoO(params) {
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules.detalhe.pagamento.O;

  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento O!`);
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createSegmentoJ(params) {
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules?.detalhe.pagamento.J;
  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
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
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules.detalhe.pagamento["J-52"];

  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
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
  let rules = rulesBanco(params.codigo_banco);
  const segmentoModel = rules.detalhe.pagamento["J-52-PIX"];

  return segmentoModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
        throw new Error(`O campo ${h.field} é obrigatório no segmento J-52-PIX!`);
      }

      if (params[h.field]) {
        return normalizeValue(params[h.field], h.type, h.length, h.format);
      }
      return normalizeValue(h.default, h.type, h.length, h.format);
    })
    .join("");
}

function createTrailerLote(params) {
  let rules = rulesBanco(params.codigo_banco);
  const trailerModel = rules.loteTrailer;

  return trailerModel
    .map((h) => {
      if (h.required && params[h.field] === undefined && h.default === undefined) {
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
  let rules = rulesBanco(params.codigo_banco);
  rules;
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
