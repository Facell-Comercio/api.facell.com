const router = require('express').Router()
const importCaixas = require('../../../controllers/datasys/caixas/import')

router.post('/import', async (req, res)=>{
    try {
        const result = await importCaixas(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;