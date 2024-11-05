function ensureArray(data) {
  if (!data) return null;
  if (Array.isArray(data)) {
    return data;
  }
  // Converte o objeto de volta para um array
  return Object.keys(data).map((key) => data[key]);
}

module.exports = {
  ensureArray,
};
