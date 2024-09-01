const router = require("express").Router();

const parcial = require("./parcial");

router.use("/parcial", parcial);

module.exports = router;