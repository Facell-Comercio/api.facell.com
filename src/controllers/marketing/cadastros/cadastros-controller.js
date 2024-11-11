module.exports = {
  getAllPlanos: require("./metodos/getAllPlanos"),
  getAllVendedores: require("./metodos/getAllVendedores"),
  getAllInteracoesManuais: require("./metodos/getAllInteracoesManuais"),

  getOnePlano: require("./metodos/getOnePlano"),
  getOneVendedor: require("./metodos/getOneVendedor"),
  getOneInteracaoManual: require("./metodos/getOneInteracaoManual"),

  getEstoqueAparelho: require("../mailing/getEstoqueAparelho"),

  insertOnePlano: require("./metodos/insertOnePlano"),
  insertOneVendedor: require("./metodos/insertOneVendedor"),
  insertOneInteracaoManual: require("./metodos/insertOneInteracaoManual"),

  updatePlano: require("./metodos/updatePlano"),
  updateVendedor: require("./metodos/updateVendedor"),
  updateInteracaoManual: require("./metodos/updateInteracaoManual"),

  deletePlano: require("./metodos/deletePlano"),
  deleteVendedor: require("./metodos/deleteVendedor"),
  deleteInteracaoManual: require("./metodos/deleteInteracaoManual"),
};
