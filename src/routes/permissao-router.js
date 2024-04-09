const router = require('express').Router()
const { getAll } = require('../controllers/permissao')

router.get('/', async (req, res)=>{
    try {
        const result = await getAll(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;