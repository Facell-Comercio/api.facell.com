const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { listarAparelhosPrice } = require('../../../../controllers/qualidade/esteira/aparelhosPriceController')
const { importarCBCF, importarExpress } = require('../../../../controllers/qualidade/esteira/ativacoesController')


// ATIVAÇÕES -----------------------------------
router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await listarAparelhosPrice({anoMes, filial, grupo_economico})
        res.status(200).json({ msg: 'Sucesso!', rows })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})

router.post('/importar/cbcf', upload.single('arquivo'), async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body
        const { relatorio } = req.query || { relatorio: 'ativ'}

        const buffer = req.file.buffer;
        const result = await importarCBCF(anoMes, buffer, grupo_economico , relatorio)
        res.status(200).json({ msg: 'Sucesso!', result })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})

router.post('/importar/express', upload.single('arquivo'), async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body

        const buffer = req.file.buffer;
        const result = await importarExpress(anoMes,  buffer, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', result })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})


module.exports = router;