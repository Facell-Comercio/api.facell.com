const router = require("express").Router();

const politicas = require("./politicas");
const configuracoes = require("./configuracoes");

// Politicas
router.use("/politicas", politicas);
router.use("/configuracoes", configuracoes);

module.exports = router;
