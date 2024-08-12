const { importCaixasDatasys } = require('../../../controllers/financeiro/conferencia-de-caixa')

const router = require('express').Router()

router.post('/import', async (req, res)=>{
    try {
        const result = await importCaixasDatasys(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;