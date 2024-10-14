module.exports = {
  getClientes: require("./metodos/getClientes"),
  getAllCampanhas: require("./metodos/getAllCampanhas"),
  getOneCampanha: require("./metodos/getOneCampanha"),

  insertCampanha: require("./metodos/insertCampanha"),

  updateClienteCampanha: require("./metodos/updateClienteCampanha"),
  updateClienteMarketingCompras: require("./metodos/updateClienteMarketingCompras"),
  importComprasDatasys: require("./metodos/importComprasDatasys"),
};
