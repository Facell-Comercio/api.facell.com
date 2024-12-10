const router = require("express").Router();

const{
    getAll,
    getOne,
    abastecerEstoque,
    concederFardamento,
    venderFardamento,
} = require("../../../controllers/pessoal/fardamento/estoque-controller");



router.get(
    "/",
    async (req,res) => {
        try {
            const result = await getAll(req);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({message: error.message});
        }
    }
)

router.get(
    "/:id",
    async (req,res) =>{
        try {
            const result = await getOne(req);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({message: error.message});
        }
    }
)

router.post(
    "/abastecer",
    abastecerEstoque
)
router.put(
    "/conceder",
    async (req,res) => {
        try {
            const result = await concederFardamento(req);
            res.status(200).json(result)
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
)
router.put(
    "/vender",
    async (req,res) => {
        try {
            const result = await venderFardamento(req);
            res.status(200).json(result)
        } catch (error) {
            res.status(500).json({message: error.message})
        }
    }
)

module.exports = router;