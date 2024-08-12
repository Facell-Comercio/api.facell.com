const router = require('express').Router()

const fiscal = require('./fiscal')
const caixas = require('./caixas')

router.use('/fiscal', fiscal)
router.use('/caixas', caixas)

module.exports = router;