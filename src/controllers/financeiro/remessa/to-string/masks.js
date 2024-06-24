function removeSpecialCharactersAndAccents(text) {
  return text
    .normalize("NFD") // Normaliza o texto para decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos
    .replace(/[^a-zA-Z0-9 ]/g, ""); // Remove caracteres especiais
}

function normalizeCodigoBarras(text) {
  if(!text) return null;
  let textoLimpo = String(text).trim().replace(/[\s.-]/g, '');
  if(textoLimpo.length !== 47){
    return null
  }
  const parte1 = textoLimpo.substring(0, 4);
  const parte3 = textoLimpo.substring(4, 9);
  const parte4 = textoLimpo.substring(10, 20);
  const parte5 = textoLimpo.substring(21, 31);
  const parte2 = textoLimpo.substring(32, 47);

  return `${parte1}${parte2}${parte3}${parte4}${parte5}`;
}

function checkLinhaDigitavel(text) {
  const dv = text.charAt(4);
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

function normalizeValue(value, type, maxLength, format) {
  if (type === "numeric" && format === "float") {
    return String(value || 0)
      .replace(".", "")
      .padStart(maxLength, "0");
  } else if (type === "numeric") {
    return String(value || 0).padStart(maxLength, "0");
  } else if (type === "date") {
    return String(value).replaceAll("/", "").padStart(maxLength, "0");
  } else {
    return removeSpecialCharactersAndAccents(String(value || "").toUpperCase())
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
