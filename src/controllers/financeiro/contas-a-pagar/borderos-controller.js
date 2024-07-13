module.exports = {
  insertOne: require("./bordero/insertOne"),
  getAll: require("./bordero/getAll"),
  getOne: require("./bordero/getOne"),
  update: require("./bordero/update"),
  reverseManualPayment: require("./bordero/reverseManualPayment"),
  deleteBordero: require("./bordero/deleteBordero"),
  deleteVencimento: require("./bordero/deleteVencimento"),
  transferBordero: require("./bordero/transferBordero"),
  exportBorderos: require("./bordero/exportBorderos"),
  exportRemessa: require("./bordero/exportRemessa"),
  importRetornoRemessa: require("./bordero/importRetornoRemessa"),
  geradorDadosEmpresa: require("./bordero/geradorDadosEmpresa"),
};
