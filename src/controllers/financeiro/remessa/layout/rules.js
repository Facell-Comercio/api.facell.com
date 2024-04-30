module.exports = {
    HSBC: {
        ArquivoHeader: require('./HSBC/ArquivoHeader.js'),
        ArquivoTrailing: require('./HSBC/ArquivoTrailing.js'),
        Pagamento: {
            LoteHeader: require('./HSBC/Pagamento/LoteHeader.js'),
            LoteTrailing: require('./HSBC/Pagamento/LoteTrailing.js'),
            Detail: require('./HSBC/Pagamento/Pagamento.js'),
            Detail2: require('./HSBC/Pagamento/Pagamento2.js'),
            Constants: require('./HSBC/Pagamento/Constants.js')
        }
    },
    BRADESCO: {
        ArquivoHeader: require('./BRADESCO/ArquivoHeader.js'),
        ArquivoTrailing: require('./BRADESCO/ArquivoTrailing.js'),
        Pagamento: {
            LoteHeader: require('./BRADESCO/Pagamento/LoteHeader.js'),
            LoteTrailing: require('./BRADESCO/Pagamento/LoteTrailing.js'),
            Detail: require('./BRADESCO/Pagamento/Pagamento.js'),
            Detail2: require('./BRADESCO/Pagamento/Pagamento2.js'),
            Constants: require('./BRADESCO/Pagamento/Constants.js')
        },
        Conciliacao: {
            LoteHeader: require('./BRADESCO/Conciliacao/LoteHeader.js'),
            LoteTrailing: require('./BRADESCO/Conciliacao/LoteTrailing.js'),
            Detail: require('./BRADESCO/Conciliacao/Conciliacao.js'),
            Constants: require('./BRADESCO/Conciliacao/Constants.js')
        }
    },
    ITAU: {
        ArquivoHeader: require('./ITAU/ArquivoHeader.js'),
        ArquivoTrailing: require('./ITAU/ArquivoTrailing.js'),
        Pagamento: {
            LoteHeader: require('./ITAU/Pagamento/LoteHeader.js'),
            LoteTrailing: require('./ITAU/Pagamento/LoteTrailing.js'),
            Detail: {
                'A': require('./ITAU/Pagamento/segmentos/A.js'),
                'B': require('./ITAU/Pagamento/segmentos/B.js'),
                'C': require('./ITAU/Pagamento/segmentos/C.js'),
                'D': require('./ITAU/Pagamento/segmentos/D.js'),
                'E': require('./ITAU/Pagamento/segmentos/E.js'),
                'F': require('./ITAU/Pagamento/segmentos/F.js'),
                'Z': require('./ITAU/Pagamento/segmentos/Z.js'),
                'J': require('./ITAU/Pagamento/segmentos/J.js'),
                'J-52': require('./ITAU/Pagamento/segmentos/J.js'),
                'J-52-PIX': require('./ITAU/Pagamento/segmentos/J.js'),
                'O': require('./ITAU/Pagamento/segmentos/O.js'),
                'N': require('./ITAU/Pagamento/segmentos/N.js'),
                'W': require('./ITAU/Pagamento/segmentos/W.js'),
            },
            Constants: require('./ITAU/Pagamento/Constants.js')
        },
        Conciliacao: {
            LoteHeader: require('./ITAU/Conciliacao/LoteHeader.js'),
            LoteTrailing: require('./ITAU/Conciliacao/LoteTrailing.js'),
            Detail: require('./ITAU/Conciliacao/Conciliacao.js'),
            Constants: require('./ITAU/Conciliacao/Constants.js')
        }
    }
};