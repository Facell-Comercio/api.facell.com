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

module.exports = {
  normalizeNumberOnly,
  normalizePhoneNumber,
  normalizeCnpjNumber,
  normalizeCepNumber,
  normalizePercentual,
  normalizeDataDayOne,
  normalizeDate,
  normalizeCurrency,
};
