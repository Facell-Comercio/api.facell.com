const router = require('express').Router()
//! SEM CONTROLLER
const {db} = require('../../mysql');
const authMiddleware = require('../middlewares/authentication-middleware');

router.get('/', authMiddleware, async (req, res)=>{
    try {
        const [users] = await db.execute(`SELECT u.*, '******' as senha FROM users u `)
        console.log(users)
        res.status(200).json(users)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

module.exports = router;