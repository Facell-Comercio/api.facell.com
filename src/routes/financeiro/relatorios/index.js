const router = require("express").Router();

const contasPagar = require("./contas-a-pagar");
const dre = require("./dre");

router.use("/contas-a-pagar", contasPagar);
router.use("/dre", dre);

module.exports = router;
