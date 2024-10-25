const router = require('express').Router()
const multer = require('multer')
const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

const ativacoesController = require('../../../../controllers/qualidade/esteira/ativacoesController')

// ATIVAÇÕES -----------------------------------
router.put('/update-cliente-cbcf', ativacoesController.updateClienteCBCF)
router.put('/update-cliente-express', ativacoesController.updateClienteExpress)

router.post('/importar/cbcf', upload.single('arquivo'), ativacoesController.importarArquivoCBCF)
router.post('/importar/express', upload.single('arquivo'), ativacoesController.importarArquivoExpress)

router.get('/gsms-cbcf', ativacoesController.getGSMClientesCBCF)
router.get('/gsms-express', ativacoesController.getGSMClientesExpress)

router.post('/listar', ativacoesController.getAtivacoes)


module.exports = router;