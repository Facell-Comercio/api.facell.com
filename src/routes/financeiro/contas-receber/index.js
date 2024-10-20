const router = require("express").Router();

// const painel = require("./painel");
const titulos = require("./titulos");
const recebimentos = require("./recebimentos");
// const movimentoContabil = require("./movimento-contabil");

// router.use("/painel", painel);
router.use("/titulo", titulos);
router.use("/recebimentos", recebimentos);
// router.use("/movimento-contabil", movimentoContabil);

module.exports = router;
