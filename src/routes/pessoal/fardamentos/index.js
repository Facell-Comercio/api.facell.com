const router = require("express").Router();
const modelos = require("./modelos-router");
const tamanhos = require("./tamanhos-router");
const estoque = require("./estoque-router");

router.use("/modelos", modelos);
router.use("/tamanhos", tamanhos);
router.use("/estoque", estoque);

module.exports = router;