module.exports = {
  bancosValidos: [
    { codigo: 341, nome: 'ITAU' }
  ],
  arquivoHeader: require("./arquivo-header/index.js"),
  arquivoTrailer: require("./arquivo-trailer/index.js"),
  loteHeader: {
    '022': require("./lote-header/022/"),
    '030': require("./lote-header/030/"),
    '033': require("./lote-header/033/"),
    '040': require("./lote-header/040/"),
  },
  loteTrailer: require("./lote-trailer/index.js"),
  detalhe: {
    pagamento: {
      A: require("./detalhe/pagamento/A.js"),
      B: require("./detalhe/pagamento/B.js"),
      C: require("./detalhe/pagamento/C.js"),
      D: require("./detalhe/pagamento/D.js"),
      E: require("./detalhe/pagamento/E.js"),
      F: require("./detalhe/pagamento/F.js"),
      G: require("./detalhe/pagamento/G.js"),
      H: require("./detalhe/pagamento/H.js"),
      Z: require("./detalhe/pagamento/Z.js"),
      J: require("./detalhe/pagamento/J.js"),
      "J-52": require("./detalhe/pagamento/J-52.js"),
      "J-52-PIX": require("./detalhe/pagamento/J-52-PIX.js"),
      O: require("./detalhe/pagamento/O.js"),
      N: require("./detalhe/pagamento/N.js"),
      W: require("./detalhe/pagamento/W.js"),
    },
    extrato: {
      E: require("./detalhe/extrato/E.js"),
    },
  },
  constants: require("./constants.js"),
};
