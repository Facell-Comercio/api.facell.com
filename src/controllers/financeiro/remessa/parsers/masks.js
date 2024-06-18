function removeSpecialCharactersAndAccents(text) {
  return text
    .normalize("NFD") // Normaliza o texto para decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos
    .replace(/[^a-zA-Z0-9 ]/g, ""); // Remove caracteres especiais
}

function normalizeCodigoBarras(text) {
  const parte1 = text.substring(0, 4);
  const parte3 = text.substring(4, 9);
  const parte4 = text.substring(10, 20);
  const parte5 = text.substring(21, 31);
  const parte2 = text.substring(32, 47);

  return `${parte1}${parte2}${parte3}${parte4}${parte5}`;
}

function checkLinhaDigitavel(text) {
  const dv = text.charAt(4);
  const linhaCheck = `${text.substring(0, 4)}${text.substring(5, 47)}`;
  console.log(text.substring(0, 4));
  console.log(text.substring(4, 47));
  const linhaCalculo = "4329876543298765432987654329876543298765432";
  let somaDigitos = 0;
  const arrayCheck = Array.from(linhaCheck);
  const arrayCalculo = Array.from(linhaCalculo);
  for (const i in arrayCheck) {
    console.log(
      arrayCheck[i],
      arrayCalculo[i],
      parseInt(arrayCheck[i]) * parseInt(arrayCalculo[i])
    );
    somaDigitos += parseInt(arrayCheck[i]) * parseInt(arrayCalculo[i]);
  }
  const modulo = somaDigitos % 11;
  const digitoVerificador = 11 - modulo;
  console.log(somaDigitos, modulo, digitoVerificador, dv);
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
};
