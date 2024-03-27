const router = require('express').Router()

const { getAll, getOne } = require('../../../controllers/financeiro/plano-contas-controller');

router.get('/', async (req, res)=>{
    try {
        const result = await getAll(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get('/:id', async (req, res)=>{
    try {
        const result = await getOne(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router;