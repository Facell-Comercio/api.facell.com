const router = require("express").Router();

const mailing = require("./mailing");

// Mailing
router.use("/mailing", mailing);

module.exports = router;
