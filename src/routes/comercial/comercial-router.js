const router = require("express").Router();

const vales = require("./vales");
const metas = require("./metas");
const agregadores = require("./agregadores");

// Vales
router.use("/vales", vales);

// Metas e Agregadores
router.use("/metas", metas);
router.use("/agregadores", agregadores);

module.exports = router;
