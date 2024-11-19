const router = require("express").Router();
const modelos = require("./modelos-router");
const tamanhos = require("./tamanhos-router");

router.use("/modelos", modelos);
router.use("/tamanhos", tamanhos);


module.exports = router;