module.exports = {
  getAllFiliaisCaixas: require("./metodos/getAllFiliaisCaixas"),
  getCaixasToRobot: require("./metodos/getCaixasToRobot"),
  getAllCaixas: require("./metodos/getAllCaixas"),
  getAllTransacoesCredit: require("./metodos/getAllTransacoesCredit"),
  getAllOcorrencias: require("./metodos/getAllOcorrencias"),
  getAllAjustes: require("./metodos/getAllAjustes"),

  getOneCaixa: require("./metodos/getOneCaixa"),
  getOneDeposito: require("./metodos/getOneDeposito"),
  getOneOcorrencia: require("./metodos/getOneOcorrencia"),
  getOneAjuste: require("./metodos/getOneAjuste"),

  updateDeposito: require("./metodos/updateDeposito"),
  updateOcorrencia: require("./metodos/updateOcorrencia"),
  updateAjuste: require("./metodos/updateAjuste"),

  importCaixasDatasys: require("./metodos/import"),
  importCaixasPorMatriz: require("./metodos/importCaixasPorMatriz"),
  importCaixasPorPeriodo: require("./metodos/importCaixasPorPeriodo"),
  importCaixasDatasys: require("./metodos/import"),

  insertOneDeposito: require("./metodos/insertOneDeposito"),
  insertMultiDepositoExtrato: require("./metodos/insertMultiDepositoExtrato"),
  insertOneOcorrencia: require("./metodos/insertOneOcorrencia"),
  insertOneAjuste: require("./metodos/insertOneAjuste"),

  cruzarRelatorios: require("./metodos/cruzarRelatorios"),
  cruzarRelatoriosLote: require("./metodos/cruzarRelatoriosLote"),
  changeStatusCaixa: require("./metodos/changeStatusCaixa"),
  changeValueFieldCaixa: require("./metodos/changeValueFieldCaixa"),
  getCardDetalhe: require("./metodos/getCardDetalhe"),
  getCardDetalheDinheiro: require("./metodos/getCardDetalheDinheiro"),

  deleteDeposito: require("./metodos/deleteDeposito"),
  deleteAjuste: require("./metodos/deleteAjuste"),

  aprovarAjuste: require("./metodos/aprovarAjuste"),
  lancamentoDespesa: require("./metodos/lancamentoDespesa"),
};
