const { listarAparelhosPOS } = require('../../../../controllers/qualidade/esteira/aparelhosPOSController')

const router = require('express').Router()


router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await listarAparelhosPOS(anoMes, filial, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', rows })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})



module.exports = router;