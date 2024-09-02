const { getParcial, getDetalheParcial } = require("../../../../controllers/comercial/dashboard/parcial/parcial-controller");

const router = require("express").Router();

router.get('/', async (req, res)=>{
    try {
        const result = await getParcial(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.get('/detalhe', async (req, res)=>{
    try {
        const result = await getDetalheParcial(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})


module.exports = router;