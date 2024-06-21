module.exports = {
  bancosValidos: [
    { codigo: 341, nome: 'ITAU' }
  ],
  ITAU: {
    arquivoHeader: require("./ITAU/arquivo-header/"),
    arquivoTrailer: require("./ITAU/arquivo-trailer/"),
    loteHeader: {
      '022': require("./ITAU/lote-header/022/"),
      '030': require("./ITAU/lote-header/030/"),
      '040': require("./ITAU/lote-header/040/"),
    },
    loteTrailer: require("./ITAU/lote-trailer/"),
    detalhe: {
      A: require("./ITAU/detalhe/A.js"),
      B: require("./ITAU/detalhe/B.js"),
      C: require("./ITAU/detalhe/C.js"),
      D: require("./ITAU/detalhe/D.js"),
      E: require("./ITAU/detalhe/E.js"),
      F: require("./ITAU/detalhe/F.js"),
      G: require("./ITAU/detalhe/G.js"),
      H: require("./ITAU/detalhe/H.js"),
      Z: require("./ITAU/detalhe/Z.js"),
      J: require("./ITAU/detalhe/J.js"),
      "J-52": require("./ITAU/detalhe/J-52.js"),
      "J-52-PIX": require("./ITAU/detalhe/J-52-PIX.js"),
      O: require("./ITAU/detalhe/O.js"),
      N: require("./ITAU/detalhe/N.js"),
      W: require("./ITAU/detalhe/W.js"),
    },
    constants: require("./ITAU/constants.js"),
  },
};
