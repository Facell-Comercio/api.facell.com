const router = require("express").Router();

// Multer
const multer = require('multer');
const { localTempStorage } = require("../libs/multer");
const { lerXMLnota, teste, updateDadosFiliais } = require("../controllers/testes-controller");
const upload = multer({ storage: localTempStorage });

const {
    gerarRateio,
    removerRateio,
    subirAnexosParaDrive,
  } = require('../controllers/testes-controller');

router.post('/', async (req, res)=>{
    try {
        // await updateDadosFiliais(req)
        res.status(200).json(true)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})

router.post('/import-xml', upload.single('file'), async (req, res)=>{
    try {
        const result = await lerXMLnota(req)
        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(400).json({message: error.message})
    }
})


module.exports = router;