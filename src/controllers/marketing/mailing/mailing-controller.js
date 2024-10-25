module.exports = {
  getAllCompras: require("./metodos/getAllCompras"),
  getAllCampanhas: require("./metodos/getAllCampanhas"),
  getOneCampanha: require("./metodos/getOneCampanha"),
  getOneClienteCampanha: require("./metodos/getOneClienteCampanha"),

  insertCampanha: require("./metodos/insertCampanha"),
  insertSubcampanha: require("./metodos/insertSubcampanha"),
  duplicateCampanha: require("./metodos/duplicateCampanha"),

  updateClienteCampanha: require("./metodos/updateClienteCampanha"),
  updateClienteCampanhaLote: require("./metodos/updateClienteCampanhaLote"),
  updateClienteMarketingCompras: require("./metodos/updateClienteMarketingCompras"),
  importComprasDatasys: require("./metodos/importComprasDatasys"),

  definirVendedoresLote: require("./metodos/definirVendedoresLote"),

  getAllAparelhos: require("./metodos/getAllAparelhos"),

  exportSubcampanha: require("./metodos/exportSubcampanha"),
};
