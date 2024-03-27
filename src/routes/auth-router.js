const router = require('express').Router()
const {register, login } = require('../controllers/auth-controller');

router.post('/register', async (req, res)=>{
    try {
        await register(req)
        res.status(200).json({message: 'Sucesso!'})
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.post('/login', async (req, res)=>{
    try {
        const data = await login(req)
        res.status(200).json(data)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;