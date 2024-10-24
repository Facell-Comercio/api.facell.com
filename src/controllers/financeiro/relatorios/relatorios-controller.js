module.exports = {
  // CONTAS A PAGAR
  exportLayoutDatasysCP: require("./metodos/contas-a-pagar/exportLayoutDatasys"),
  exportLayoutDespesasCP: require("./metodos/contas-a-pagar/exportLayoutDespesas"),
  exportLayoutPrevisaoPagamentoCP: require("./metodos/contas-a-pagar/exportLayoutPrevisaoPagamento"),
  exportLayoutVencimentosCP: require("./metodos/contas-a-pagar/exportLayoutVencimentos"),

  // CONTROLE DE CAIXA
  exportLayoutRecargaRV: require("./metodos/controle-de-caixa/exportLayoutRecargaRV"),
  exportLayoutCartoes: require("./metodos/controle-de-caixa/exportLayoutCartoes"),
  exportLayoutCrediario: require("./metodos/controle-de-caixa/exportLayoutCrediario"),
  exportLayoutPitzi: require("./metodos/controle-de-caixa/exportLayoutPitzi"),
  exportLayoutPix: require("./metodos/controle-de-caixa/exportLayoutPix"),
  exportLayoutTradein: require("./metodos/controle-de-caixa/exportLayoutTradein"),

  // DRE
  exportLayoutDREGerencial: require("./metodos/dre/exportLayoutDREGerencial"),
};
