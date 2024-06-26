const router = require('express').Router()

const { getAll, getOne, toggleActive, update, insertOne } = require('../../../controllers/financeiro/cadastros/formas-pagamento-controller');

router.get('/', async (req, res) => {
    try {
        const result = await getAll(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get('/:id', async (req, res) => {
    try {
        const result = await getOne(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.post('/', async (req, res) => {
    try {
        const result = await insertOne(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.put('/', async (req, res) => {
    try {
        const result = await update(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.delete('/:id', async (req, res) => {
    try {
        const result = await toggleActive(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

module.exports = router;