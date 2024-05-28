const router = require('express').Router()

const faturados = require("./gn/faturados.js");
const pedidos = require("./gn/pedidos.js");
const posicaoFinanceira = require("./gn/posicao-financeira.js");

router.use("/faturados", faturados);
router.use("/pedidos", pedidos);
router.use("/posicao-financeira", posicaoFinanceira);

module.exports = router;