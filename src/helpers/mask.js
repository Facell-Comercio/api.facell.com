const { parseISO, format, formatISO, formatISO9075 } = require("date-fns");
const { formatDate } = require("date-fns/format");

const normalizeNumberOnly = (value) => {
  if (!value) return "";
  return String(value).replace(/[\D]/g, "");
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

const normalizeDate = (data) => {
  if (!data) return null;
  if (typeof data === "string") {
    return data && data.split("T")[0].split("-").reverse().join("/");
  }
  if (data instanceof Date) {
    return data.toLocaleDateString("pt-BR");
  }
  return null;
};
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

const formatDatabaseDate = (data) => {
  if (!data) {
    return null;
  }

  const [ano, mes, dia] = formatDate(data, "yyyy-MM-dd").split("-");

  const baseDate = new Date(1899, 11, 30, 0, 0, 0);
  const baseDateUtc = new Date(Date.UTC(1899, 11, 30, 0, 0, 0));
  const timezoneOffsetFix =
    baseDateUtc.valueOf() +
    baseDate.getTimezoneOffset() * 60000 -
    baseDate.valueOf();

  const date = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));

  const needFix =
    new Date(date.valueOf() - timezoneOffsetFix).getTimezoneOffset() !==
    baseDate.getTimezoneOffset();
  const fixedDate = needFix
    ? new Date(date.valueOf() - timezoneOffsetFix)
    : date;

  return fixedDate;
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

  let textoLimpo = normalizeNumberOnly(text);

  if (textoLimpo.length === 44) {
    return textoLimpo;
  }
  if (textoLimpo.length !== 47) {
    throw new Error(
      `Línha digitável deve possuir 47 caracteres, ou o código de barras possuir 44 caracteres! Recebido ${text.length} caracteres!`
    );
  }
  const parte1 = textoLimpo.substring(0, 4);
  const parte3 = textoLimpo.substring(4, 9);
  const parte4 = textoLimpo.substring(10, 20);
  const parte5 = textoLimpo.substring(21, 31);
  const parte2 = textoLimpo.substring(32, 47);

  return `${parte1}${parte2}${parte3}${parte4}${parte5}`;
}

/**
 * Função que transforma linha digitável em Código de Barras
 * */
function normalizeCodigoBarras48(texto) {
  if (!texto) return null;

  // Remove pontos e espaços
  let textoTratado = normalizeNumberOnly(texto);
  if (textoTratado.length == 44) return textoTratado;

  if (textoTratado.length !== 48) {
    throw new Error(
      `A linha digitável deve ter 48 caracteres, ou o código de barras possuir 44 caracteres! Recebido ${textoTratado.length} caracteres.`
    );
  }

  // Extrai campos da linha digitável
  let campo1 = textoTratado.substring(0, 11);
  let campo2 = textoTratado.substring(12, 23);
  let campo3 = textoTratado.substring(24, 35);
  let campo4 = textoTratado.substring(36, 47);

  // Combina campos para formar o código de barras
  let codigoBarras =
    campo1.substring(0, 11) +
    campo2.substring(0, 11) +
    campo3.substring(0, 11) +
    campo4.substring(0, 11);

  return codigoBarras;
}

/**
 * Função que extrai URL / Chave de endereçamento do PIX Copia e Cola
 * */
function normalizeURLChaveEnderecamentoPIX(qr_code) {
  if (!qr_code) {
    throw new Error("QR Code não informado!");
  }
  // const qr = qr_code.trim();
  // if (!qr.toLowerCase().includes("br.gov.bcb.pix")) {
  //   throw new Error("Chave PIX não identificada");
  // }
  // const etapa1 = qr.toLowerCase().split("br.gov.bcb.pix");
  // const caracteres = parseInt(etapa1[1].substring(2, 4)) + 4;
  // return etapa1[1].substring(4, caracteres);

  // Verifica se o QR Code contém a URL do PSP (indicativo de QR dinâmico)
  if (qr_code.toLowerCase().includes("pix.bpp.com.br")) {
    const urlStart = qr_code.toLowerCase().indexOf("pix.bpp.com.br");
    const etapa1 = qr_code.substring(urlStart);
    const tamanhoUrl = parseInt(etapa1.substring(17, 21)); // Extrai o tamanho da URL
    return etapa1.substring(21, 21 + tamanhoUrl); // Retorna a URL completa
  } else if (qr_code.toLowerCase().includes("br.gov.bcb.pix")) {
    // Caso seja um QR estático
    const etapa1 = qr_code.toLowerCase().split("br.gov.bcb.pix");
    const tamanhoChave = parseInt(etapa1[1].substring(2, 4)) + 4;
    return etapa1[1].substring(4, tamanhoChave); // Retorna a chave de endereçamento
  } else {
    throw new Error("Chave PIX ou URL não identificada");
  }
}

function excelDateToJSDate(serial) {
  // Ponto de início (1900 ou 1904)
  const baseDate = new Date(1900, 0, 1); // 1 de janeiro de 1900
  const days = serial - 2; // Ajuste para o bug do Excel que considera 1900 como ano bissexto
  return new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
}

function objectToStringLine(object) {
  return Object.values(object).reduce((acc, value) => {
    if (value instanceof Date) {
      const dia = String(value.getDate()).padStart(2, "0");
      const mes = String(value.getMonth() + 1).padStart(2, "0");
      const ano = value.getFullYear();

      value = `${dia}${mes}${ano}`;
    }
    return acc + (value !== null && value !== undefined ? String(value) : "");
  }, "");
}

function normalizeNumberFixed(number, fractionDigits) {
  if (typeof number === "string" && parseFloat(number)) {
    return parseFloat(parseFloat(number || "0").toFixed(fractionDigits));
  }
  if (typeof number === "number" && !isNaN(number)) {
    return parseFloat(number.toFixed(fractionDigits) || "0");
  }
  return null;
}

function parseCurrency(value) {
  // Remove o símbolo "R$" e espaços em branco
  let numericValue = value.replace(/[R$\s]/g, "");

  // Remove o separador de milhar (pontos) e substitui a vírgula por ponto
  numericValue = numericValue.replace(/\./g, "").replace(",", ".");

  // Converte para número
  return parseFloat(numericValue);
}

module.exports = {
  normalizeNumberOnly,
  normalizePhoneNumber,
  normalizeCnpjNumber,
  normalizeCepNumber,
  normalizePercentual,
  normalizeDataDayOne,
  normalizeDate,
  formatDatabaseDate,
  normalizeCurrency,
  normalizeFirstAndLastName,
  removeSpecialCharactersAndAccents,
  normalizeCodigoBarras,
  normalizeCodigoBarras48,
  normalizeURLChaveEnderecamentoPIX,
  excelDateToJSDate,
  objectToStringLine,
  normalizeNumberFixed,
  parseCurrency,
};
