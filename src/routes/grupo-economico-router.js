const router = require('express').Router()
const { db } = require('../../mysql');

router.get('/', async (req, res)=>{
    try {
        const [grupos] = await db.execute('SELECT * FROM grupos_economicos')
        res.status(200).json(grupos)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;