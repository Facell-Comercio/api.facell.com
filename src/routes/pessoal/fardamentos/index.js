const router = require("express").Router();

const {
    getAll,
    insertOne,
    update,
} = require("../../../controllers/pessoal/fardamento/modelos-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

router.get(
    "/",
    checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
    async(req,res)=>{
        try{
            const result = await getAll(req);
            res.status(200).json(result);
        } catch (error){
            res.status(500).json({message: error.message});
        }
    }
);

router.post(
    "/",
    checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
    async(req,res)=>{
        try{
            const result = await insertOne(req);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({message: error.message});
        }
    }
);

router.put(
    "/",
    checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
    async(req,res) =>{
        try{
            const result = await update(req);
            res.status(200).json(result);
        } catch (error) {
            res.status(500).json({message: error.message});
        }
    }
);

module.exports = router;