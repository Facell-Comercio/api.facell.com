const router = require("express").Router();

const vales = require("./vales");

// Vales
router.use("/vales", vales);

module.exports = router;
