const router = require('express').Router()
const { getTitulos } = require('../../controller/financeiro/contas-a-pagar/titulos');
const authMiddleware = require('../../middleware/authenticationMiddleware');

router.get('/contas-a-pagar/lancar', authMiddleware, (req, res)=>{
    res.status(200).json([
        {id: 1, descr: 'dokdlkdd'},
        {id: 2, descr: 'adsadda'},
    ])
})

router.get('/contas-a-pagar/titulos', authMiddleware, async (req, res)=>{
    const result = await getTitulos(req)
    res.status(200).json(result)
})

module.exports = router;