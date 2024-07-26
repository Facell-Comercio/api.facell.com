module.exports = {
  getAll: require("./conciliacao-cp/getAll"),
  getConciliacoes: require("./conciliacao-cp/getConciliacoes"),
  getOne: require("./conciliacao-cp/getOne"),
  getExtratosCredit: require("./conciliacao-cp/getExtratosCredit"),
  getExtratoDuplicated: require("./conciliacao-cp/getExtratoDuplicated"),

  insertOne: require("./conciliacao-cp/insertOne"),
  conciliacaoAutomatica: require("./conciliacao-cp/conciliacaoAutomatica"),
  conciliacaoTarifas: require("./conciliacao-cp/conciliacaoTarifas"),
  conciliacaoTransferenciaContas: require("./conciliacao-cp/conciliacaoTransferenciaContas"),
  tratarDuplicidade: require("./conciliacao-cp/tratarDuplicidade"),

  deleteConciliacao: require("./conciliacao-cp/deleteConciliacao"),
};
