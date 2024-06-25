const normalizeNumberOnly = (value) => {
  if (!value) return "";
  return value.replace(/[\D]/g, "");
};

const normalizePhoneNumber = (value) => {
  if (!value) return "";

  return value
    .replace(/[\D]/g, "")
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2")
    .replace(/(-\d{4})(\d+?)/, "$1");
};

const normalizeCnpjNumber = (value) => {
  if (!value) return "";
  const pureValue = value.replace(/[\D]/g, "");
  if (pureValue.length <= 11) {
    return pureValue
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})/, "$1-$2")
      .replace(/(-\d{2})\d+?$/, "$1");
  }
  return pureValue
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2")
    .replace(/(-\d{2})\d+?$/, "$1");
};

const normalizeCepNumber = (value) => {
  if (!value) return "";
  return value
    .replace(/\D/g, "")
    .replace(/^(\d{5})(\d{3})/, "$1-$2")
    .replace(/(-\d{3})(\d+?)/, "$1")
    .substring(0, 9);
};

const normalizePercentual = (value) => {
  if (!value) return "0.00%";
  const valueMultiplicado = parseFloat(value);
  if (isNaN(valueMultiplicado)) {
    return "0.00%";
  }
  return valueMultiplicado.toLocaleString("pt-BR", {
    style: "percent",
    minimumFractionDigits: 2,
  });
};

const normalizeDataDayOne = (dataString) => {
  if (dataString) {
    const data = new Date(dataString);

    const ano = data.getFullYear();
    const mes = (data.getMonth() + 1).toString().padStart(2, "0");

    const dataFormatada = `${ano}-${mes}-01`;

    return dataFormatada;
  }
};

const normalizeDate = (data) =>
  data && data.split("T")[0].split("-").reverse().join("/");
const normalizeCurrency = (data) => {
  if (typeof data === "string") {
    const valor = parseFloat(data);
    if (!valor) return "R$ 0,00";
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  } else {
    return data.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    });
  }
};

function normalizeFirstAndLastName(nomeCompleto) {
  if (!nomeCompleto) return "NOME NÃO INFORMADO!";
  // Usa uma expressão regular para extrair o primeiro e último nome
  const match = nomeCompleto.match(/^(\S+)\s+(.+)\s+(\S+)$/);

  // Verifica se houve uma correspondência
  if (match) {
    const primeiroNome = match[1];
    const ultimoNome = match[3];
    return `${primeiroNome} ${ultimoNome}`;
  } else {
    // Se não houver correspondência, assume que o nome completo é o primeiro nome
    return `${nomeCompleto}`;
  }
}

function removeSpecialCharactersAndAccents(str) {
  const regex = /[^A-Za-z0-9\s]/g;
  const normalizedStr = str.replace(regex, "");
  const lowerCaseStr = normalizedStr.toLowerCase();
  const trimmedStr = lowerCaseStr.trim();
  return trimmedStr;
}

/** 
 * Transforma linha digitável em Código de Barras
 * */ 
function normalizeCodigoBarras(text) {
  if (!text) return null;
  let textoLimpo = String(text)
    .trim()
    .replace(/[\s.-]/g, "");
  if (textoLimpo.length !== 47) {
    return null;
  }
  const parte1 = textoLimpo.substring(0, 4);
  const parte3 = textoLimpo.substring(4, 9);
  const parte4 = textoLimpo.substring(10, 20);
  const parte5 = textoLimpo.substring(21, 31);
  const parte2 = textoLimpo.substring(32, 47);

  return `${parte1}${parte2}${parte3}${parte4}${parte5}`;
}

/** 
 * Função que extrai URL / Chave de endereçamento do PIX Copia e Cola
 * */ 
function normalizeURLChaveEnderecamentoPIX(qr_code) {
  const qr = qr_code.trim();
  if (!qr.toLowerCase().includes("br.gov.bcb.pix")) {
    throw new Error("Chave PIX não identificada");
  }
  const etapa1 = qr.toLowerCase().split("br.gov.bcb.pix");
  const caracteres = parseInt(etapa1[1].substring(2, 4)) + 4;
  return etapa1[1].substring(4, caracteres);
}

module.exports = {
  normalizeNumberOnly,
  normalizePhoneNumber,
  normalizeCnpjNumber,
  normalizeCepNumber,
  normalizePercentual,
  normalizeDataDayOne,
  normalizeDate,
  normalizeCurrency,
  normalizeFirstAndLastName,
  removeSpecialCharactersAndAccents,
  normalizeCodigoBarras,
  normalizeURLChaveEnderecamentoPIX,
};
