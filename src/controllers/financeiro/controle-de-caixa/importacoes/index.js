const getLogsImportRelatorio = require("./metodos/getLogsImportRelatorio");

module.exports = {
  getLogsImportRelatorio,
  importCieloVendas: require("./metodos/importCieloVendas"),
  importCrediario: require("./metodos/importCrediario"),
  importPixBradesco: require("./metodos/importPixBradesco"),
  importPixItau: require("./metodos/importPixItau"),
  importPitziVendas: require("./metodos/importPitziVendas"),
  importRenovTradein: require("./metodos/importRenovTradein"),
  importRecargaRvCellcard: require("./metodos/importRecargaRvCellcard"),
};