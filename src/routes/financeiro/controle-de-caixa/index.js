const router = require("express").Router();

const conferenciaDeCaixa = require("./conferencia-de-caixa");
const importacoes = require("./importacoes");
const boletos = require("./boletos");

router.use("/conferencia-de-caixa", conferenciaDeCaixa);
router.use("/importacoes", importacoes);
router.use("/boletos", boletos);

module.exports = router;
