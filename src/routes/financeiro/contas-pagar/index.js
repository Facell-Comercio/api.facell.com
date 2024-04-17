const router = require("express").Router();

const titulos = require("./titulos");
const bordero = require("./borderos");

router.use("/titulo", titulos);
router.use("/bordero", bordero);

module.exports = router;
