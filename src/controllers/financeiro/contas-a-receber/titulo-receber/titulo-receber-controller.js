module.exports = {
  getAll: require("./metodos/getAll"),
  getOne: require("./metodos/getOne"),
  insertOne: require("./metodos/insertOne"),
  update: require("./metodos/update"),
  getAllVencimentosCR: require("./metodos/getAllVencimentosCR"),

  getAllRecebimentosVencimento: require("./metodos/getAllRecebimentosVencimento"),
  insertOneRecebimento: require("./metodos/insertOneRecebimento"),
  deleteRecebimento: require("./metodos/deleteRecebimento"),

  changeStatusTituloReceber: require("./metodos/changeStatusTituloReceber"),
};
