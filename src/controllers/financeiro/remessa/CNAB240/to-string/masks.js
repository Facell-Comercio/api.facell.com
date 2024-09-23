const { normalizeDate, normalizeNumberOnly } = require("../../../../../helpers/mask");

// function removeSpecialCharactersAndAccents(text) {
//   return text
//     .normalize("NFD") // Normaliza o texto para decompor caracteres acentuados
//     .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos
//     .replace(/[^a-zA-Z0-9 ]/g, ""); // Remove caracteres especiais
// }

function removeSpecialCharactersAndAccents(text, allowedSpecialCharacters = "") {
  // Cria uma expressão regular dinâmica para incluir os caracteres permitidos
  const allowedCharactersRegex = new RegExp(
    `[^a-zA-Z0-9 ${allowedSpecialCharacters.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}]`,
    "g"
  );

  return text
    .normalize("NFD") // Normaliza o texto para decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos
    .replace(allowedCharactersRegex, ""); // Remove caracteres especiais, exceto os permitidos
}

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

function checkLinhaDigitavel(textLinha) {
  if (!textLinha) {
    return false;
  }
  const text = textLinha.trim();
  const dv = String(text).charAt(4);
  const linhaCheck = `${text.substring(0, 4)}${text.substring(5, 47)}`;

  const linhaCalculo = "4329876543298765432987654329876543298765432";
  let somaDigitos = 0;
  const arrayCheck = Array.from(linhaCheck);
  const arrayCalculo = Array.from(linhaCalculo);
  for (const i in arrayCheck) {
    somaDigitos += parseInt(arrayCheck[i]) * parseInt(arrayCalculo[i]);
  }
  const modulo = somaDigitos % 11;
  const digitoVerificador = 11 - modulo;

  return digitoVerificador === parseInt(dv);
}

function normalizeValue(value, type, maxLength, format, allowedCharacter) {
  if (type === "numeric" && format === "float") {
    return String(value || 0)
      .replace(".", "")
      .padStart(maxLength, "0");
  } else if (type === "numeric") {
    return String(normalizeNumberOnly(value) || 0).padStart(maxLength, "0");
  } else if (type === "date") {
    return String(normalizeDate(value, "ddMMyyyy")).replaceAll("/", "").padStart(maxLength, "0");
  } else if (format === "any") {
    return String(value || "")
      .padEnd(maxLength, " ")
      .slice(0, maxLength);
  } else {
    return removeSpecialCharactersAndAccents(String(value || ""), allowedCharacter || "")
      .padEnd(maxLength, " ")
      .slice(0, maxLength);
  }
}

module.exports = {
  normalizeValue,
  removeSpecialCharactersAndAccents,
  checkLinhaDigitavel,
  normalizeCodigoBarras,
};
