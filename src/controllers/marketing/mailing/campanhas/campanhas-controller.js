module.exports = {
  getAllCampanhas: require("./metodos/getAllCampanhas"),
  getOneCampanha: require("./metodos/getOneCampanha"),
  getOneClienteCampanha: require("./metodos/getOneClienteCampanha"),

  insertSubcampanha: require("./metodos/insertSubcampanha"),
  duplicateCampanha: require("./metodos/duplicateCampanha"),

  updateClienteCampanha: require("./metodos/updateClienteCampanha"),
  updateClienteCampanhaLote: require("./metodos/updateClienteCampanhaLote"),
  updateClienteMarketingCompras: require("./metodos/updateClienteMarketingCompras"),

  definirVendedoresLote: require("./metodos/definirVendedoresLote"),

  getAllAparelhos: require("../getAllAparelhos"),
  getAllVendedores: require("../getAllVendedores"),

  exportSubcampanha: require("./metodos/exportSubcampanha"),

  deleteClientesCampanhaLote: require("./metodos/deleteClientesCampanhaLote"),
};
