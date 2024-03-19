const router = require('express').Router()

const contasPagar = require('./contas-pagar')
const planoContas = require('./plano-contas')
const fornecedores = require('./fornecedores')

router.use('/contas-a-pagar', contasPagar)
router.use('/plano-contas', planoContas)
router.use('/fornecedores', fornecedores)

module.exports = router;