module.exports = {
  bancosValidos: [
    { codigo: 341, nome: 'ITAU' }
  ],
  ITAU: {
    arquivoHeader: require("./ITAU/arquivo-header/"),
    detalhe: require("./ITAU/detalhe/"),
    arquivoTrailer: require("./ITAU/arquivo-trailer/"),
    constants: require("./ITAU/constants.js"),
  },
};
