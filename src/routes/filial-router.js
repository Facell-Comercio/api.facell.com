const router = require('express').Router()
const { db } = require('../../mysql');

router.get('/', async (req, res)=>{
    try {
        const [filiais] = await db.execute('SELECT * FROM filiais')
        res.status(200).json(filiais)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;