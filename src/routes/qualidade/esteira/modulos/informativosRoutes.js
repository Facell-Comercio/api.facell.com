const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const { listarInformativos, insertInformativo, editarInformativo, deletarInformativo } = require('../../../../controllers/qualidade/esteira/informativosController')


// Informativos
router.get('/', async (req, res)=>{
    try {
        const result = await listarInformativos()
        res.status(200).json(result)
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})

router.post('/novo', async (req, res)=>{
    try {
        await insertInformativo(req.body)
        res.status(200).json({msg: 'Sucesso!'})
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})

router.post('/editar', async (req, res)=>{
    try {
        await editarInformativo(req.body)
        res.status(200).json({msg: 'Sucesso!'})
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})

router.post('/excluir', async (req, res)=>{
    try {
        await deletarInformativo(req.body)
        res.status(200).json({msg: 'Sucesso!'})
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})


module.exports = router;