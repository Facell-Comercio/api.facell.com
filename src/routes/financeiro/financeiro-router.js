const router = require('express').Router()
const { getTitulos, getTitulo } = require('../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller');
const authMiddleware = require('../../middlewares/authentication-middleware');


router.get('/contas-a-pagar/titulo', authMiddleware, async (req, res)=>{
    const result = await getTitulos(req)
    res.status(200).json(result)
})

router.get('/contas-a-pagar/titulo/:id', authMiddleware, async (req, res)=>{
    const result = await getTitulo(req)
    res.status(200).json(result)
})

module.exports = router;