const router = require('express').Router()

const contasPagar = require('./contas-pagar')
const planoContas = require('./plano-contas')
const fornecedores = require('./fornecedores')
const formasPagamento = require('./formas-pagamento')

router.use('/contas-a-pagar', contasPagar)
router.use('/plano-contas', planoContas)
router.use('/fornecedores', fornecedores)
router.use('/formas-pagamento', formasPagamento)

module.exports = router;