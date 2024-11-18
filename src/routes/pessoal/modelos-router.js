const router = require("express").Router();

const modelos = require("./fardamentos");

router.use("/fardamentos/modelos", modelos);

module.exports = router;
