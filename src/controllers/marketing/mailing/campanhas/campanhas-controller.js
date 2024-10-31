module.exports = {
  getAllCampanhas: require("./metodos/getAllCampanhas"),
  getOneCampanha: require("./metodos/getOneCampanha"),
  getOneCampanhaRobo: require("./metodos/getOneCampanhaRobo"),
  getOneClienteCampanha: require("./metodos/getOneClienteCampanha"),

  insertSubcampanha: require("./metodos/insertSubcampanha"),
  duplicateCampanha: require("./metodos/duplicateCampanha"),

  updateCampanha: require("./metodos/updateCampanha"),
  updateClienteCampanha: require("./metodos/updateClienteCampanha"),
  updateClienteCampanhaLote: require("./metodos/updateClienteCampanhaLote"),
  updateClienteMarketingCompras: require("./metodos/updateClienteMarketingCompras"),

  definirVendedoresLote: require("./metodos/definirVendedoresLote"),

  getAllAparelhos: require("../getAllAparelhos"),
  getAllVendedores: require("../getAllVendedores"),

  exportSubcampanha: require("./metodos/exportSubcampanha"),
  importCampanhaEvolux: require("./metodos/importCampanhaEvolux"),

  deleteClientesCampanhaLote: require("./metodos/deleteClientesCampanhaLote"),
};
