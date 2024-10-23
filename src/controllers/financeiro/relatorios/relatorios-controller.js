module.exports = {
  // CONTAS A PAGAR
  exportLayoutDatasysCP: require("./metodos/contas-a-pagar/exportLayoutDatasys"),
  exportLayoutDespesasCP: require("./metodos/contas-a-pagar/exportLayoutDespesas"),
  exportLayoutPrevisaoPagamentoCP: require("./metodos/contas-a-pagar/exportLayoutPrevisaoPagamento"),
  exportLayoutVencimentosCP: require("./metodos/contas-a-pagar/exportLayoutVencimentos"),

  // DRE
  exportLayoutDREGerencial: require("./metodos/dre/exportLayoutDREGerencial"),
};
