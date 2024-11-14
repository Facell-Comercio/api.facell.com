module.exports = {
  getAllVendasInvalidadas: require("./vendas-invalidadas/getAllVendasInvalidadas"),
  getOneVendaInvalidada: require("./vendas-invalidadas/getOneVendaInvalidada"),
  getOneContestacao: require("./vendas-invalidadas/getOneContestacao"),

  insertOneContestacao: require("./vendas-invalidadas/insertOneContestacao"),
  updateStatusContestacao: require("./vendas-invalidadas/updateStatusContestacao"),

  deleteContestacao: require("./vendas-invalidadas/deleteContestacao"),

  processarVendasInvalidadas: require("./vendas-invalidadas/processarVendasInvalidadas"),
  excluirVendasInvalidadas: require("./vendas-invalidadas/excluirVendasInvalidadas"),

  rateioAutomaticoVendasInvalidas: require("./vendas-invalidadas/rateioAutomaticoVendasInvalidas"),
};
