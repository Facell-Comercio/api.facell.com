const { obterParcial } = require("../../../../controllers/comercial/dashboard/parcial/parcial-controller");

const router = require("express").Router();

router.get('/', async (req, res)=>{
    try {
        const result = await obterParcial(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;