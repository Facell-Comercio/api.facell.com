const router = require("express").Router();

const vales = require("./vales");
const metas = require("./metas");
const agregadores = require("./agregadores");
const comissionamento = require("./comissionamento");
const vendasInvalidadas = require("./comissionamento/vendas-invalidadas");

// Vales
router.use("/vales", vales);

// Metas e Agregadores
router.use("/metas", metas);
router.use("/agregadores", agregadores);

// Comissionamento
router.use("/comissionamento", comissionamento);

module.exports = router;
