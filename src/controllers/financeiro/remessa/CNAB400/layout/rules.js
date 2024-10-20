module.exports = {
  bancosValidos: [{ codigo: 341, nome: "ITAU" }],

  arquivoHeader: require("./arquivo-header/index.js"),
  detalhe: require("./detalhe/index.js"),
  retorno: require("./retorno/index.js"),
  arquivoTrailer: require("./arquivo-trailer/index.js"),
  constants: require("./constants.js"),
};
