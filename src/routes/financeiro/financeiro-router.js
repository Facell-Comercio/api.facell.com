const router = require("express").Router();

const contasPagar = require("./contas-pagar");
const planoContas = require("./plano-contas");
const centroCustos = require("./centro-custos");
const fornecedores = require("./fornecedores");
const formasPagamento = require("./formas-pagamento");

router.use("/contas-a-pagar", contasPagar);
router.use("/fornecedores", fornecedores);
router.use("/plano-contas", planoContas);
router.use("/centro-custos", centroCustos);
router.use("/formas-pagamento", formasPagamento);

module.exports = router;
