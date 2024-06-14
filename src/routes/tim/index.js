const router = require('express').Router()

const faturados = require("./gn/faturados.js");
const pedidos = require("./gn/pedidos.js");
const notasFiscais = require("./gn/notas-fiscais.js");

router.use("/gn/faturados", faturados);
router.use("/gn/pedidos", pedidos);
router.use("/gn/notas-fiscais", notasFiscais);

module.exports = router;