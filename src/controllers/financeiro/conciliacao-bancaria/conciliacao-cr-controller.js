module.exports = {
  getAll: require("./conciliacao-cr/getAll"),
  getConciliacoes: require("./conciliacao-cr/getConciliacoes"),
  getOne: require("./conciliacao-cr/getOne"),
  getExtratosDebit: require("./conciliacao-cr/getExtratosDebit"),
  getExtratoDuplicated: require("./conciliacao-cr/getExtratoDuplicated"),

  insertOne: require("./conciliacao-cr/insertOne"),
  conciliacaoAutomatica: require("./conciliacao-cr/conciliacaoAutomatica"),
  conciliacaoTransferenciaContas: require("./conciliacao-cr/conciliacaoTransferenciaContas"),
  tratarDuplicidade: require("./conciliacao-cr/tratarDuplicidade"),

  deleteConciliacao: require("./conciliacao-cr/deleteConciliacao"),
};
