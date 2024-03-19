const router = require('express').Router()

const { getAll } = require('../../../controllers/financeiro/fornecedores-controller');

router.get('/', async (req, res)=>{
    const result = await getAll(req)
    res.status(200).json(result)
})

module.exports = router;