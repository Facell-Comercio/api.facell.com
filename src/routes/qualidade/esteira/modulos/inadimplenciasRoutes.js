const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { importarSGR, listarInadimplencias } = require('../../../../controllers/qualidade/esteira/inadimplenciasController')


// INADIMPLÊNCIAS
router.post('/importar/sgr', upload.single('arquivo'), async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body
        const buffer = req.file.buffer;
        const result = await importarSGR(anoMes, buffer, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', result })

    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })

    }
})

router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await listarInadimplencias(anoMes, filial, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', rows })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})

module.exports = router;