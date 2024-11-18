const router = require("express").Router();

const tamanhos = require("./fardamentos/tamanhos");

router.use("/tamanhos",tamanhos);

module.exports = router;

