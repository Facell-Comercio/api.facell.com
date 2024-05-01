const router = require("express").Router();

const titulos = require("./titulos");
const bordero = require("./borderos");
const conciliacao = require("./conciliacao");
const movimentoContabil = require("./movimento-contabil");

router.use("/titulo", titulos);
router.use("/bordero", bordero);
router.use("/conciliacao", conciliacao);
router.use("/movimento-contabil", movimentoContabil);

module.exports = router;
