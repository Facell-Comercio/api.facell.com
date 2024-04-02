const router = require("express").Router();

const fornecedores = require("./fornecedores");
const contasPagar = require("./contas-pagar");
const planoContas = require("./plano-contas");
const centroCustos = require("./centro-custos");
const bancos = require("./bancos");
const contasBancarias = require("./contas-bancarias");
const formasPagamento = require("./formas-pagamento");

router.use("/contas-a-pagar", contasPagar);
router.use("/fornecedores", fornecedores);
router.use("/plano-contas", planoContas);
router.use("/centro-custos", centroCustos);
router.use("/bancos", bancos);
router.use("/contas-bancarias", contasBancarias);
router.use("/formas-pagamento", formasPagamento);

module.exports = router;
