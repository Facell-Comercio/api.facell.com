const router = require("express").Router();

const ativacoesRoutes = require('./modulos/ativacoesRoutes')
const aparelhosPriceRoutes = require('./modulos/aparelhosPriceRoutes')
const fidelizacoesRoutes = require('./modulos/fidelizacoesRoutes')
const inadimplenciasRoutes = require('./modulos/inadimplenciasRoutes')
const thalesRoutes = require('./modulos/thalesRoutes')
const portabilidadesSolicitadasRoutes = require('./modulos/portabilidadesSolicitadasRoutes')
const doccenterRoutes = require('./modulos/doccenterRoutes')
const informativosRoutes = require('./modulos/informativosRoutes')
const contestacoesAnomaliasRoutes = require('./modulos/contestacoesAnomaliasRoutes')
const duplicidadesDatasysRoutes = require('./modulos/duplicidadesDatasysRoutes')
const devolucoesRoutes = require('./modulos/devolucoesRoutes')
const aparelhosPOSRoutes = require('./modulos/aparelhosPOSRoutes')
const quebrasEsteira = require('./modulos/quebrasEsteira')


router.use('/ativacoes', ativacoesRoutes)
router.use('/aparelhos-price', aparelhosPriceRoutes)
router.use('/fidelizacoes', fidelizacoesRoutes)
router.use('/inadimplencias', inadimplenciasRoutes)
router.use('/thales', thalesRoutes)
router.use('/portabilidades-solicitadas', portabilidadesSolicitadasRoutes)
router.use('/doccenter', doccenterRoutes)
router.use('/informativos', informativosRoutes)
router.use('/contestacoes-anomalias', contestacoesAnomaliasRoutes)
router.use('/duplicidades', duplicidadesDatasysRoutes)
router.use('/devolucoes', devolucoesRoutes)
router.use('/aparelhos-pos', aparelhosPOSRoutes)
router.use('/quebras-esteira', quebrasEsteira)

const { salvarObsDocs, updateStatusDocs } = require('../../../controllers/qualidade/esteira/esteiraController')

// Observações
router.post('/obs/salvar', async (req, res)=>{
    try {
        await salvarObsDocs(req.body)
        res.status(200).json({msg: 'Sucesso!'})
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})

// Status manual
router.post('/status/update', async (req, res)=>{
    try {
        await updateStatusDocs(req.body)
        res.status(200).json({msg: 'Sucesso!'})
    } catch (error) {
        console.log(error)
        res.status(400).json({msg: error})
    }
})

module.exports = router;