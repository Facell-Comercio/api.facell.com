const router = require("express").Router();

const contasPagar = require("./contas-a-pagar");
const controleCaixa = require("./controle-de-caixa");
const dre = require("./dre");

router.use("/contas-a-pagar", contasPagar);
router.use("/controle-de-caixa", controleCaixa);
router.use("/dre", dre);

module.exports = router;
