const { getAll, validarRecebimento, lancarFinanceiroEmLote, insertMany } = require('../../../controllers/tim/gn/notas-fiscais')

const router = require('express').Router()

router.get('/', async(req,res)=>{
    try {
        const result = await getAll(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

router.post('/check-datasys', async(req,res)=>{
    try {
        const result = await validarRecebimento(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

router.post('/check-financeiro', async(req,res)=>{
    try {
        const result = await lancarFinanceiroEmLote(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

router.post('/', async(req,res)=>{
    try {
        const result = await insertMany(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;