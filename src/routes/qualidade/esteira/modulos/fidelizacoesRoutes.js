const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { importarCBCF } = require('../../../../controllers/qualidade/esteira/ativacoesController')
const { listarFidelizacoes } = require('../../../../controllers/qualidade/esteira/fidelizacoesController')
const fidelizacoesController = require('../../../../controllers/qualidade/esteira/fidelizacoesController')

router.get('/gsms', fidelizacoesController.getGSMFidelizacoesAparelho)

// FIDELIZAÇÕES
router.post('/listar', async (req, res) => {
    try {
        const { anoMes, filial, grupo_economico } = req.body

        const rows = await fidelizacoesController.listarFidelizacoes({anoMes, filial, grupo_economico})
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