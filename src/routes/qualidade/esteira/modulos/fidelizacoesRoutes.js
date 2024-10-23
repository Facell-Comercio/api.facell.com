const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { importarCBCF } = require('../../../../controllers/qualidade/esteira/ativacoesController')
const { listarFidelizacoes } = require('../../../../controllers/qualidade/esteira/fidelizacoesController')


// FIDELIZAÇÕES
router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await listarFidelizacoes(anoMes, filial, grupo_economico)
        res.status(200).json({ msg: 'Sucesso!', rows })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})

router.post('/importar/cbcf', upload.single('arquivo'), async (req, res) => {
    try {
        const { anoMes, grupo_economico } = req.body
        const {relatorio} = req.query || { relatorio: 'fid'}

        const buffer = req.file.buffer;
        const result = await importarCBCF(anoMes, buffer, grupo_economico, relatorio)
        res.status(200).json({ msg: 'Sucesso!', result })
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})


module.exports = router;