module.exports = {
  bancosValidos: [
    {codigo: 341, nome: 'ITAU'}
  ],
  ITAU: {
    ArquivoHeader: require("./ITAU/ArquivoHeader.js"),
    ArquivoTrailing: require("./ITAU/ArquivoTrailing.js"),
    Pagamento: {
      LoteHeader: require("./ITAU/Pagamento/LoteHeader.js"),
      LoteTrailing: require("./ITAU/Pagamento/LoteTrailing.js"),
      Detail: {
        A: require("./ITAU/Pagamento/segmentos/A.js"),
        B: require("./ITAU/Pagamento/segmentos/B.js"),
        C: require("./ITAU/Pagamento/segmentos/C.js"),
        D: require("./ITAU/Pagamento/segmentos/D.js"),
        E: require("./ITAU/Pagamento/segmentos/E.js"),
        F: require("./ITAU/Pagamento/segmentos/F.js"),
        G: require("./ITAU/Pagamento/segmentos/G.js"),
        H: require("./ITAU/Pagamento/segmentos/H.js"),
        Z: require("./ITAU/Pagamento/segmentos/Z.js"),
        J: require("./ITAU/Pagamento/segmentos/J.js"),
        "J-52": require("./ITAU/Pagamento/segmentos/J-52.js"),
        "J-52-PIX": require("./ITAU/Pagamento/segmentos/J-52-PIX.js"),
        O: require("./ITAU/Pagamento/segmentos/O.js"),
        N: require("./ITAU/Pagamento/segmentos/N.js"),
        W: require("./ITAU/Pagamento/segmentos/W.js"),
      },
      Constants: require("./ITAU/Pagamento/Constants.js"),
    },
    Conciliacao: {
      LoteHeader: require("./ITAU/Conciliacao/LoteHeader.js"),
      LoteTrailing: require("./ITAU/Conciliacao/LoteTrailing.js"),
      Detail: require("./ITAU/Conciliacao/Conciliacao.js"),
      Constants: require("./ITAU/Conciliacao/Constants.js"),
    },
  },

};
