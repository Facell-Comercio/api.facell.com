module.exports = {
  // VENDAS INVÁLIDAS
  getAllVendasInvalidadas: require("./vendas-invalidadas/getAllVendasInvalidadas"),
  getOneVendaInvalidada: require("./vendas-invalidadas/getOneVendaInvalidada"),
  processarVendasInvalidadas: require("./vendas-invalidadas/processarVendasInvalidadas"),
  excluirVendasInvalidadas: require("./vendas-invalidadas/excluirVendasInvalidadas"),
  updateLote: require("./vendas-invalidadas/updateLote"),
  rateioAutomaticoVendasInvalidas: require("./vendas-invalidadas/rateioAutomaticoVendasInvalidas"),

  // CONTESTAÇÕES
  getOneContestacao: require("./vendas-invalidadas/getOneContestacao"),
  insertOneContestacao: require("./vendas-invalidadas/insertOneContestacao"),
  updateStatusContestacao: require("./vendas-invalidadas/updateStatusContestacao"),
  deleteContestacao: require("./vendas-invalidadas/deleteContestacao"),

  // RATEIOS
  getOneRateio: require("./vendas-invalidadas/getOneRateio"),
  insertOneRateio: require("./vendas-invalidadas/insertOneRateio"),
  updateRateio: require("./vendas-invalidadas/updateRateio"),
  deleteRateio: require("./vendas-invalidadas/deleteRateio"),

  // OUTROS
  criacaoAutomaticaVales: require("./vendas-invalidadas/criacaoAutomaticaVales"),
};
