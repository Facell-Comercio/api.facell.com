const router = require("express").Router();

const painel = require("./painel");
const titulos = require("./titulos");
const vencimentos = require("./vencimentos");
const dda = require("./dda");
const bordero = require("./borderos");
const cartoes = require("./cartoes");
const movimentoContabil = require("./movimento-contabil");

router.use("/painel", painel);
router.use("/titulo", titulos);
router.use("/vencimentos", vencimentos);
router.use("/dda", dda);
router.use("/bordero", bordero);
router.use("/cartoes", cartoes);
router.use("/movimento-contabil", movimentoContabil);

module.exports = router;
