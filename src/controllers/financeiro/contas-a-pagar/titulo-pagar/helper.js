const {
    format,
    startOfDay,
    formatDate,
    addDays,
    isMonday,
    isThursday,
    isSaturday,
    isSunday,
    subDays,
    isWednesday,
    isFriday,
} = require("date-fns");

const checkFeriado = (date) => {
    // Aqui você pode implementar a lógica para verificar se a data é um feriado
    // Por exemplo, verificar em uma lista de feriados
    // Este é um exemplo simples que considera apenas os feriados fixos no ano
    const feriadosFixos = [
        "01-01",
        "04-21",
        "05-01",
        "09-07",
        "10-12",
        "11-02",
        "11-15",
        "12-25",
    ];
    const formattedDate = format(date, "MM-dd");
    return feriadosFixos.includes(formattedDate);
}

const calcularDataPrevisaoPagamento = (data_venc) => {
    const dataVencimento = startOfDay(data_venc); // Inicia com o próximo dia

    const dataAtual = startOfDay(new Date());
    let dataMinima = isFriday(dataAtual) ?  addDays(dataAtual, 3) : addDays(dataAtual, 2);

    while (
        (!isMonday(dataMinima) &&
            !isWednesday(dataMinima) &&
            !isFriday(dataMinima)) ||
        checkFeriado(dataMinima)
    ) {
        dataMinima = addDays(dataMinima, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
    }
    let dataPagamento = dataMinima;

    // 27-04 <= 26-04
    if (dataVencimento <= dataMinima) {
        // A data de vencimento é inferior a data atual,
        //então vou buscar a partir da data atual + 1 a próxima data de pagamento
        while (
            dataPagamento < dataMinima ||
            (!isMonday(dataPagamento) &&
                !isWednesday(dataPagamento) &&
                !isFriday(dataPagamento)) ||
            checkFeriado(dataPagamento)
        ) {
            dataPagamento = addDays(dataPagamento, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
        }
    } else {
        dataPagamento = dataVencimento;
        if (isSaturday(dataPagamento)) {
            dataPagamento = addDays(dataPagamento, 2);
        }
        if (isSunday(dataPagamento)) {
            dataPagamento = addDays(dataPagamento, 1);
        }
        while (
            (!isMonday(dataPagamento) &&
                !isWednesday(dataPagamento) &&
                !isFriday(dataPagamento)) ||
            checkFeriado(dataPagamento)
        ) {
            dataPagamento = subDays(dataPagamento, 1); // Avança para o próximo dia até encontrar uma segunda ou quinta-feira que não seja feriado
        }
    }

    return dataPagamento;
}

module.exports = {
    checkFeriado,
    calcularDataPrevisaoPagamento
}