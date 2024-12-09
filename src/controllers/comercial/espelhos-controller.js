module.exports = {
  getAll: require("./espelhos/getAll"),
  getOne: require("./espelhos/getOne"),
  deleteOne: require("./espelhos/deleteOne"),

  // CONTESTAÇÕES
  getAllContestacoes: require("./espelhos/getAllContestacoes"),
  getOneContestacao: require("./espelhos/getOneContestacao"),
  insertOneContestacao: require("./espelhos/insertOneContestacao"),
  updateContestacao: require("./espelhos/updateContestacao"),
  deleteContestacao: require("./espelhos/deleteContestacao"),

  // ITENS
  getAllItens: require("./espelhos/getAllItens"),
  getOneItem: require("./espelhos/getOneItem"),
  insertOneItem: require("./espelhos/insertOneItem"),
  updateItem: require("./espelhos/updateItem"),
  deleteItem: require("./espelhos/deleteItem"),

  getAllVendasInvalidadas: require("./espelhos/getAllVendasInvalidas"),
  getAllMetasAgregadores: require("./espelhos/getAllMetasAgregadores"),

  // ITENS
  getAllItens: require("./espelhos/getAllItens"),
  getOneItem: require("./espelhos/getOneItem"),
  insertOneItem: require("./espelhos/insertOneItem"),
  updateItem: require("./espelhos/updateItem"),
  deleteItem: require("./espelhos/deleteItem"),

  getAllVendasInvalidadas: require("./espelhos/getAllVendasInvalidas"),
  getAllMetasAgregadores: require("./espelhos/getAllMetasAgregadores"),

  calcularEspelhos: require("./espelhos/calcularEspelhos"),
  recalcularEspelho: require("./espelhos/recalcularEspelho"),
};
