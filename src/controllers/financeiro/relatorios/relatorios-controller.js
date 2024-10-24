module.exports = {
  // CONTAS A PAGAR
  exportLayoutDatasysCP: require("./metodos/contas-a-pagar/exportLayoutDatasys"),
  exportLayoutDespesasCP: require("./metodos/contas-a-pagar/exportLayoutDespesas"),
  exportLayoutPrevisaoPagamentoCP: require("./metodos/contas-a-pagar/exportLayoutPrevisaoPagamento"),
  exportLayoutVencimentosCP: require("./metodos/contas-a-pagar/exportLayoutVencimentos"),

  // CONTROLE DE CAIXA
  exportLayoutRecargaRV: require("./metodos/controle-de-caixa/exportLayoutRecargaRV"),

  // DRE
  exportLayoutDREGerencial: require("./metodos/dre/exportLayoutDREGerencial"),
};
