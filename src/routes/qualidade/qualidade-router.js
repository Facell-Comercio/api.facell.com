const router = require("express").Router();

const esteiraRouter = require('./esteira/esteira-router')
router.use('/esteira', esteiraRouter)

module.exports = router;