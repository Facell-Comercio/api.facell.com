module.exports = {
  getEscalonamentos: require("./configuracoes/getEscalonamentos"),
  getSegmentos: require("./configuracoes/getSegmentos"),
  getCargos: require("./configuracoes/getCargos"),

  //* IMPORTAÇÕES
  importTimQualidade: require("./configuracoes/importTimQualidade"),
  importTimGU: require("./configuracoes/importTimGU"),
  importTimGUManual: require("./configuracoes/importTimGUManual"),
  importTimAppTimVendas: require("./configuracoes/importTimAppTimVendas"),
  importTimEsteiraFull: require("./configuracoes/importTimEsteiraFull"),
  importTimTrafegoZeroDep: require("./configuracoes/importTimTrafegoZeroDep"),
  importTimPort: require("./configuracoes/importTimPort"),
  importTimDACC: require("./configuracoes/importTimDACC"),
};
