const router = require('express').Router()

const { getAll, getOne, insertOne, update } = require('../../../controllers/financeiro/plano-contas-controller');
const { checkUserDepartment } = require('../../../helpers/checkUserDepartment');
const { checkUserPermission } = require('../../../helpers/checkUserPermission');
const checkUserAuthorization = require('../../../middlewares/authorization-middleware');

router.get('/', async (req, res)=>{
    try {
        const result = await getAll(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

router.get('/:id', async (req, res)=>{
    try {
        const result = await getOne(req)
        res.status(200).json(result)
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})
router.post('/', checkUserAuthorization('FINANCEIRO','OR','MASTER'), async (req, res)=>{
    try {
        const result = await insertOne(req)
        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})
router.put('/', async (req, res)=>{
    try {
        const result = await update(req)
        res.status(200).json(result)
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})

module.exports = router;