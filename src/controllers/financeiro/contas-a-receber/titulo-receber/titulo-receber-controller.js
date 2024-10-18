module.exports = {
  getAll: require("./metodos/getAll"),
  getOne: require("./metodos/getOne"),
  insertOneTituloReceber: require("./metodos/insertOneTituloReceber"),
  update: require("./metodos/update"),
  getAllVencimentosCR: require("./metodos/getAllVencimentosCR"),

  getAllRecebimentosVencimento: require("./metodos/getAllRecebimentosVencimento"),
  deleteRecebimento: require("./metodos/deleteRecebimento"),

  changeStatusTituloReceber: require("./metodos/changeStatusTituloReceber"),

  lancamentoReembolsosTim: require("./metodos/lancamentoReembolsosTim"),
  lancamentoComissoesTim: require("./metodos/lancamentoComissoesTim"),
  reembolsosTimZIP: require("./metodos/reembolsosTimZIP"),
};
