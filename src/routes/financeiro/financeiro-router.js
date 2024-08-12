const router = require("express").Router();

const contasPagar = require("./contas-pagar");
const conferenciaDeCaixa = require("./conferencia-de-caixa");

const orcamento = require("./orcamento");

const fornecedores = require("./cadastros/fornecedores");
const planoContas = require("./cadastros/plano-contas");
const centroCustos = require("./cadastros/centro-custos");
const bancos = require("./cadastros/bancos");
const contasBancarias = require("./cadastros/contas-bancarias");
const equipamentosCielo = require("./cadastros/equipamentos-cielo");
const rateios = require("./cadastros/rateios");

const formasPagamento = require("./formas-pagamento");
const extratosBancarios = require("./extratos-bancarios");
const conciliacaoCP = require("./conciliacao-bancaria/conciliacao/cp");
const tarifas = require("./conciliacao-bancaria/conciliacao/config/tarifas-padrao");

// Contas a pagar
router.use("/contas-a-pagar", contasPagar);

// Coferência de caixa
router.use("/conferencia-de-caixa", conferenciaDeCaixa);

// Orçamento
router.use("/orcamento", orcamento);

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

module.exports = router;
