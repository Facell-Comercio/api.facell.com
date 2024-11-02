module.exports = {
  getAllPlanos: require("./metodos/getAllPlanos"),
  getAllVendedores: require("./metodos/getAllVendedores"),
  getOnePlano: require("./metodos/getOnePlano"),
  getOneVendedor: require("./metodos/getOneVendedor"),
  getEstoqueAparelho: require("../mailing/getEstoqueAparelho"),

  insertOnePlano: require("./metodos/insertOnePlano"),
  insertOneVendedor: require("./metodos/insertOneVendedor"),

  updatePlano: require("./metodos/updatePlano"),
  updateVendedor: require("./metodos/updateVendedor"),

  deletePlano: require("./metodos/deletePlano"),
  deleteVendedor: require("./metodos/deleteVendedor"),
};
