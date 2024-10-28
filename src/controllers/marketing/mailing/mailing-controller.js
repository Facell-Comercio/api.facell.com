const campanhasController = require("./campanhas/campanhas-controller");
const clientesController = require("./clientes/clientes-controller");

module.exports = {
  getAllAparelhos: require("./getAllAparelhos"),
  getAllVendedores: require("./getAllVendedores"),

  ...campanhasController,
  ...clientesController,
};
