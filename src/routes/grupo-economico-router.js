const router = require('express').Router()
const { db } = require('../../mysql');

router.get('/', async (req, res)=>{
    try {
        const [grupos] = await db.execute('SELECT * FROM grupos_economicos')
        console.log(grupos)
        res.status(200).json(grupos)
    } catch (error) {
        console.log(error)
        res.status(400).json({message: error.message})
    }
})

module.exports = router;