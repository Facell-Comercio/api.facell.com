const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { importarDocCenter, cruzarDocCenter, listarLinhasPendentesDeLancamento } = require('../../../../controllers/qualidade/esteira/docCenterController')


// DOC CENTER
router.post('/importar', upload.single('arquivo'), async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body
        const buffer = req.file.buffer;

        await importarDocCenter(anoMes, buffer, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ message: error.message })
    }
})

router.post('/reprocessar', async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body

        await cruzarDocCenter(anoMes, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error })
    }
})

router.post('/listarpendentes', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body
        
        result = await listarLinhasPendentesDeLancamento(anoMes, filial, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', docs: result })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})


module.exports = router;