function removeSpecialCharactersAndAccents(text) {
  return text
    .normalize("NFD") // Normaliza o texto para decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, "") // Remove os diacríticos
    .replace(/[^a-zA-Z0-9 ]/g, ""); // Remove caracteres especiais
}

function normalizeValue(value, type, maxLength, format) {
  if (type === "numeric") {
    return format === "float"
      ? String(value || 0)
          .replace(".", "")
          .padStart(maxLength, "0")
      : String(value || 0).padStart(maxLength, "0");
  } else if (type === "date") {
    return String(value || "")
      .replaceAll("/", "")
      .padStart(maxLength, "0");
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
