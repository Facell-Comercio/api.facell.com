const router = require("express").Router();

const vales = require("./vales");
const metas = require("./metas");

// Vales
router.use("/vales", vales);

// Metas
router.use("/metas", metas);

module.exports = router;
