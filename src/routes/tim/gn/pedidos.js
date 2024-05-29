const { getAll } = require('../../../controllers/tim/gn/pedidos')

const router = require('express').Router()

router.get('/', async(req,res)=>{
    try {
        const result = await getAll(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;