const XLSX = require("xlsx");

module.exports = (relatorioFilial) => {
  // Função para organizar e mesclar os dados dinamicamente
  const organizarDadosPorLinha = (filiais) => {
    const linhasCombinadas = [];
    const maiorTamanho = Math.max(...filiais.map((filial) => filial.length));

    for (let i = 0; i < maiorTamanho; i++) {
      const linha = [];

      let index = 0;
      for (const filial of filiais) {
        if (filial[i]) {
          // Adiciona os valores de cada filial para a linha combinada
          Object.values(filial[i]).forEach((valor) => {
            linha.push(valor); // Converte números, mantém strings e coloca vazio para null/undefined
          });
        } else {
          // Se não houver dados para a filial atual nessa linha, preenche com valores vazios
          linha.push(...Object.keys(filial[0]).map(() => ""));
        }

        // Adiciona uma coluna vazia entre filiais (exceto depois da última filial)
        if (index < filiais.length - 1) {
          linha.push(""); // Adiciona coluna vazia
        }
        index++;
      }

      linhasCombinadas.push(linha);
    }

    return linhasCombinadas;
  };

  // Função para gerar cabeçalhos dinamicamente
  const gerarCabecalhos = (filiais) => {
    const cabecalhos = [];

    let index = 0;
    for (const filial of filiais) {
      // Usa os nomes dos atributos como cabeçalhos
      cabecalhos.push(...Object.keys(filial[0]));

      // Adiciona uma coluna vazia entre filiais (exceto depois da última filial)
      if (index < filiais.length - 1) {
        cabecalhos.push(""); // Coluna vazia
      }
      index++;
    }

    return cabecalhos;
  };

  // Organiza os dados e gera cabeçalhos
  const dadosFinal = organizarDadosPorLinha(relatorioFilial);
  const cabecalhos = gerarCabecalhos(relatorioFilial);

  // Adiciona os cabeçalhos às linhas combinadas
  dadosFinal.unshift(cabecalhos);

  // Cria a planilha com os dados combinados
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(dadosFinal);
  XLSX.utils.book_append_sheet(workbook, worksheet, "Planilha1");

  // Gera e retorna o buffer
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

  return buffer;
};
