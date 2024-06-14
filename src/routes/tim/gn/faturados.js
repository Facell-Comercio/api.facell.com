const { getAll, insertMany } = require('../../../controllers/tim/gn/faturados')

const router = require('express').Router()

router.get('/', async(req,res)=>{
    try {
        const result = await getAll(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

router.post('/', async(req,res)=>{
    try {
        const result = await insertMany(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;