const router = require("express").Router();

const mailing = require("./mailing");
const cadastros = require("./cadastros");

// Mailing
router.use("/mailing", mailing);
router.use("/cadastros", cadastros);

module.exports = router;
