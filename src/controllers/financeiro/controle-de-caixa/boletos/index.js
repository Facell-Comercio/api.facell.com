const importRetornoRemessaBoleto = require("./metodos/importRetornoRemessaBoleto");

module.exports = {
  getAllBoletos: require("./metodos/getAllBoletos"),
  getAllCaixasComSaldo: require("./metodos/getAllCaixasComSaldo"),

  getOneBoleto: require("./metodos/getOneBoleto"),

  insertOneBoleto: require("./metodos/insertOneBoleto"),

  cancelarBoleto: require("./metodos/cancelarBoleto"),

  importRetornoRemessaBoleto: require("./metodos/importRetornoRemessaBoleto"),
  exportRemessaBoleto: require("./metodos/exportRemessaBoleto"),
};
