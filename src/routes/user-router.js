const { getAll, getOne } = require('../controllers/users')

const router = require('express').Router()

router.get('/', async (req, res)=>{
    try {
        const users = await getAll(req)
        res.status(200).json(users)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.get('/:id', async (req, res)=>{
    try {
        const user = await getOne(req)
        res.status(200).json(user)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;