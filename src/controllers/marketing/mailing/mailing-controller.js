const campanhasController = require("./campanhas/campanhas-controller");
const clientesController = require("./clientes/clientes-controller");

module.exports = {
  getAllAparelhos: require("./getAllAparelhos"),
  getEstoqueAparelho: require("./getEstoqueAparelho"),

  ...campanhasController,
  ...clientesController,
};
