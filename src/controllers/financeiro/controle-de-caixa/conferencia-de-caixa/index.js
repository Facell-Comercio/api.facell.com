module.exports = {
  getFiliais: require("./metodos/getFiliais"),
  getAllCaixas: require("./metodos/getAllCaixas"),
  getAllOcorrencias: require("./metodos/getAllOcorrencias"),

  getOneCaixa: require("./metodos/getOneCaixa"),
  getOneDeposito: require("./metodos/getOneDeposito"),
  getOneOcorrencia: require("./metodos/getOneOcorrencia"),

  updateDeposito: require("./metodos/updateDeposito"),
  updateOcorrencia: require("./metodos/updateOcorrencia"),

  importCaixasDatasys: require("./metodos/import"),
  importCaixasPorMatriz: require("./metodos/importCaixasPorMatriz"),
  insertOneDeposito: require("./metodos/insertOneDeposito"),
  insertOneOcorrencia: require("./metodos/insertOneOcorrencia"),

  importCaixasDatasys: require("./metodos/import"),
  changeStatusCaixa: require("./metodos/changeStatusCaixa"),
  deleteDeposito: require("./metodos/deleteDeposito"),
};
