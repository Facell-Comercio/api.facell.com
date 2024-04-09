const { getAll, getOne, update, insertOne } = require('../controllers/filial')

const router = require('express').Router()

router.get('/', async (req, res)=>{
    try {
        const result = await getAll(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})
router.get('/:id', async (req, res)=>{
    try {
        const result = await getOne(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.put('/', async (req, res)=>{
    try {
        await update(req)
        res.status(200).json({message: 'Sucesso!'})
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.post('/', async (req, res)=>{
    try {
        await insertOne(req)
        res.status(200).json({message: 'Sucesso!'})
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;