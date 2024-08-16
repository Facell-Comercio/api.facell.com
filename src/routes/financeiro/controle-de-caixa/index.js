const router = require("express").Router();

const conferenciaDeCaixa = require('./conferencia-de-caixa');
const importacoes = require('./importacoes');

router.use('/conferencia-de-caixa', conferenciaDeCaixa);
router.use('/importacoes', importacoes);

module.exports = router;