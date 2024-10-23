const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { listarDocs, processarDocs, thalesCharts, listarCredenciais, editarCredenciais, exportarLinhas } = require('../../../../controllers/qualidade/esteira/thalesController')


// THALES
router.post('/', async (req, res) => {
    try {
        const result = await listarDocs(req)
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error, docs: [] })
    }
})
router.post('/exportar', async (req, res) => {
    try {
        const docs = await exportarLinhas(req.body)

        res.status(200).json({ docs: docs })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error, docs: [] })
    }
})

router.post('/charts', async (req, res) => {
    try {
        const { anoMes, filial,grupo_economico, dataInicial, dataFinal } = req.body

        const { resumo_status, resumo_filial } = await thalesCharts({anoMes, filial, grupo_economico, dataInicial, dataFinal})

        res.status(200).json({ msg: 'Sucesso!', resumo_status, resumo_filial })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error, docs: [] })
    }
})

router.post('/processar', async (req, res) => {
    try {
        const { dataInicial, dataFinal, grupo_economico } = req.body

        const docs = await processarDocs({dataInicial, dataFinal, grupo_economico})
        res.status(200).json({ msg: 'Sucesso!' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error })
    }
})

// get credentials
router.post('/config-robo/listar-credenciais/', async (req, res) => {
    try {
        const { grupo_economico } = req.body

        const result = await listarCredenciais({ grupo_economico})
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error })
    }
})

// update credentials
router.post('/config-robo/editar-credenciais/', async (req, res) => {
    try {
        const { grupo_economico, token, senha } = req.body

        await editarCredenciais({grupo_economico, token, senha})
        res.status(200).json({ msg: 'Sucesso!' })
    } catch (error) {
        console.log(error)
        res.status(400).json({ msg: error })
    }
})

module.exports = router;