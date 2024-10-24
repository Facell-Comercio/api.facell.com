const router = require("express").Router();

const contasPagar = require("./contas-pagar");
const contasReceber = require("./contas-receber");
const controleDeCaixa = require("./controle-de-caixa");

const orcamento = require("./orcamento");

const fornecedores = require("./cadastros/fornecedores");
const planoContas = require("./cadastros/plano-contas");
const centroCustos = require("./cadastros/centro-custos");
const bancos = require("./cadastros/bancos");
const contasBancarias = require("./cadastros/contas-bancarias");
const equipamentosCielo = require("./cadastros/equipamentos-cielo");
const rateios = require("./cadastros/rateios");
const tesouraria = require("./tesouraria");

const formasPagamento = require("./formas-pagamento");
const extratosBancarios = require("./extratos-bancarios");
const conciliacaoCP = require("./conciliacao-bancaria/conciliacao/cp");
const conciliacaoCR = require("./conciliacao-bancaria/conciliacao/cr");
const relatorios = require("./relatorios");
const tarifas = require("./conciliacao-bancaria/conciliacao/config/tarifas-padrao");

// Contas a pagar
router.use("/contas-a-pagar", contasPagar);

// Contas a receber
router.use("/contas-a-receber", contasReceber);

// Conferência de caixa
router.use("/controle-de-caixa", controleDeCaixa);

// Orçamento
router.use("/orcamento", orcamento);

// Tesouraria
router.use("/tesouraria", tesouraria);

// Cadastros
router.use("/fornecedores", fornecedores);
router.use("/plano-contas", planoContas);
router.use("/centro-custos", centroCustos);
router.use("/bancos", bancos);
router.use("/contas-bancarias", contasBancarias);
router.use("/equipamentos-cielo", equipamentosCielo);
router.use("/rateios", rateios);

router.use("/formas-pagamento", formasPagamento);

router.use("/conciliacao-bancaria", extratosBancarios);
router.use("/conciliacao-cp", conciliacaoCP);
router.use("/conciliacao-cr", conciliacaoCR);

// Relatórios
router.use("/relatorios", relatorios);

module.exports = router;
