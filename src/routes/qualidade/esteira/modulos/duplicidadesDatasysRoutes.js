const router = require('express').Router()

const { listarDuplicidadesDatasys } = require('../../../../controllers/qualidade/esteira/duplicidadesDatasysController')

router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await listarDuplicidadesDatasys(anoMes, filial, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', rows })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})



module.exports = router;