const router = require('express').Router()

const { getAll, toggleActive, update, insertOne } = require('../../../controllers/financeiro/fornecedores-controller');

router.get('/', async (req, res)=>{
    const result = await getAll(req)
    res.status(200).json(result)
})

router.get('/', async (req, res)=>{
    const result = await getAll(req)
    res.status(200).json(result)
})

router.post('/', async (req, res)=>{
    const result = await insertOne(req)
    res.status(200).json(result)
})

router.put('/', async (req, res)=>{
    const result = await update(req)
    res.status(200).json(result)
})

router.delete('/:id', async (req, res)=>{
    const result = await toggleActive(req)
    res.status(200).json(result)
})

module.exports = router;