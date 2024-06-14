const router = require('express').Router()

const fiscal = require('./fiscal')

router.use('/fiscal', fiscal)

module.exports = router;