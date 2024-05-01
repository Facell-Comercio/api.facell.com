const { lerOFX } = require('../../../controllers/financeiro/contas-a-pagar/ofx')

const router = require('express').Router()

router.get('/', async (req, res) => {
    try {
        const result = await lerOFX()
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})


module.exports = router;