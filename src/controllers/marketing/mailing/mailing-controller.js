module.exports = {
  getAllCompras: require("./metodos/getAllCompras"),
  getAllCampanhas: require("./metodos/getAllCampanhas"),
  getOneCampanha: require("./metodos/getOneCampanha"),
  getOneClienteCampanha: require("./metodos/getOneClienteCampanha"),

  insertCampanha: require("./metodos/insertCampanha"),
  insertSubcampanha: require("./metodos/insertSubcampanha"),

  updateClienteCampanha: require("./metodos/updateClienteCampanha"),
  updateClienteCampanhaLote: require("./metodos/updateClienteCampanhaLote"),
  updateClienteMarketingCompras: require("./metodos/updateClienteMarketingCompras"),
  importComprasDatasys: require("./metodos/importComprasDatasys"),

  getAllAparelhos: require("./metodos/getAllAparelhos"),
};
