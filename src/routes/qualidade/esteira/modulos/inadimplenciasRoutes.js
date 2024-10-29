const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const inadimplenciasController = require('../../../../controllers/qualidade/esteira/inadimplenciasController')


// INADIMPLÊNCIAS
router.get('/clientes', inadimplenciasController.getClientesInadimplencia)
router.put('/update-cliente', inadimplenciasController.updateClienteInadimplencia)
router.post('/importar/sgr', upload.single('arquivo'), inadimplenciasController.importarArquivoSGR)
router.post('/listar', inadimplenciasController.getInadimplencias)

module.exports = router;