module.exports = {
  getFiliais: require("./metodos/getFiliais"),
  getCaixasToRobot: require("./metodos/getCaixasToRobot"),
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
  insertMultiDepositoExtrato: require("./metodos/insertMultiDepositoExtrato"),
  insertOneOcorrencia: require("./metodos/insertOneOcorrencia"),

  importCaixasDatasys: require("./metodos/import"),
  cruzarRelatorios: require("./metodos/cruzarRelatorios"),
  cruzarRelatoriosLote: require("./metodos/cruzarRelatoriosLote"),
  changeStatusCaixa: require("./metodos/changeStatusCaixa"),
  changeValueFieldCaixa: require("./metodos/changeValueFieldCaixa"),
  getCardDetalhe: require("./metodos/getCardDetalhe"),
  deleteDeposito: require("./metodos/deleteDeposito"),
  getAllTransacoesCredit: require("./metodos/getAllTransacoesCredit"),
};
