const router = require('express').Router()

const { getAll, getOne } = require('../../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller');

router.get('/titulo', async (req, res)=>{
    const result = await getAll(req)
    res.status(200).json(result)
})

router.get('/titulo/:id', async (req, res)=>{
    const result = await getOne(req)
    res.status(200).json(result)
})

module.exports = router;