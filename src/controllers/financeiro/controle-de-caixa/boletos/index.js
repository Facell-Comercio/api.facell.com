module.exports = {
  visualizarBoletoCaixa: require("./metodos/visualizarBoleto"),
  
  getAllBoletos: require("./metodos/getAllBoletos"),
  getAllCaixasComSaldo: require("./metodos/getAllCaixasComSaldo"),
  getOneBoleto: require("./metodos/getOneBoleto"),

  insertOneBoleto: require("./metodos/insertOneBoleto"),

  cancelarBoleto: require("./metodos/cancelarBoleto"),

  exportRemessaBoleto: require("./metodos/exportRemessaBoleto"),

  insertOneReceptoresBoletos: require("./metodos/insertOneReceptoresBoletos"),
  getAllReceptoresBoletos: require("./metodos/getAllReceptoresBoletos"),
  deleteReceptoresBoletos: require("./metodos/deleteReceptoresBoletos"),
};
