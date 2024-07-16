module.exports = {
  getAll: require("./conciliacao-cp/getAll"),
  getConciliacoes: require("./conciliacao-cp/getConciliacoes"),
  getOne: require("./conciliacao-cp/getOne"),
  getExtratosCredit: require("./conciliacao-cp/getExtratosCredit"),

  insertOne: require("./conciliacao-cp/insertOne"),
  conciliacaoAutomatica: require("./conciliacao-cp/conciliacaoAutomatica"),
  conciliacaoTarifas: require("./conciliacao-cp/conciliacaoTarifas"),
  conciliacaoTransferenciaContas: require("./conciliacao-cp/conciliacaoTransferenciaContas"),
  deleteConciliacao: require("./conciliacao-cp/deleteConciliacao"),
};
