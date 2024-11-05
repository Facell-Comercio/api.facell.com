const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { listarPortabilidadesSolicitadas } = require('../../../../controllers/qualidade/esteira/portabilidadesSolicitadasController')


// PORTABILIDADES SOLICITADAS
// router.post('/importar', upload.single('arquivo'), async (req, res) => {
//     try {
//         const xlsxFileBuffer = req.file.buffer;

//         const result = await importarPortabilidadesSolicitadas(xlsxFileBuffer)
//         console.log(result)
//         res.status(200).json({ msg: 'Sucesso!' })
//     } catch (error) {
//         console.log(error)
//         res.status(400).json({ msg: error })
//     }
// })

router.post('/listar', async (req, res) => {
    try {
        const result = await listarPortabilidadesSolicitadas(req.body)
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
        res.status(401).json({ msg: error })
    }
})


module.exports = router;