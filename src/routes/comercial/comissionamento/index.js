const router = require("express").Router();

const politicas = require("./politicas");
const configuracoes = require("./configuracoes");
const vendasInvalidas = require("./vendas-invalidadas");

// Politicas
router.use("/politicas", politicas);
router.use("/configuracoes", configuracoes);
router.use("/vendas-invalidadas", vendasInvalidas);

module.exports = router;
