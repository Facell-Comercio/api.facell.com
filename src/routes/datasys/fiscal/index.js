const { findNFbyParams } = require('../../../controllers/datasys/fiscal');

const router = require('express').Router()

router.get('/nota-fiscal', async (req, res)=>{
    try {
        const result = await findNFbyParams(req)
        res.status(200).send(result)
    } catch (error) {
        res.status(400).send({message: error.message})
    }
})

module.exports = router;