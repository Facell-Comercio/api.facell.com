const router = require("express").Router();

const painel = require("./painel");
const titulos = require("./titulos");
const vencimentos = require("./vencimentos");
const bordero = require("./borderos");
const movimentoContabil = require("./movimento-contabil");

router.use("/painel", painel);
router.use("/titulo", titulos);
router.use("/vencimentos", vencimentos);
router.use("/bordero", bordero);
router.use("/movimento-contabil", movimentoContabil);

module.exports = router;
