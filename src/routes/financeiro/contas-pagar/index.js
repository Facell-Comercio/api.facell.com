const router = require("express").Router();

const titulos = require("./titulos");
const vencimentos = require("./vencimentos");
const bordero = require("./borderos");
const movimentoContabil = require("./movimento-contabil");

router.use("/titulo", titulos);
router.use("/vencimentos", vencimentos);
router.use("/bordero", bordero);
router.use("/movimento-contabil", movimentoContabil);

module.exports = router;
