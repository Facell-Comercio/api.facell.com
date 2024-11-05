const router = require("express").Router();
const {
    insertOneReceptoresBoletos,
    getAllReceptoresBoletos,
    deleteReceptoresBoletos
} = require("../../../../controllers/financeiro/controle-de-caixa/boletos");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

// * Receptores de Boletos:
router.post("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
    try {
        const result = await insertOneReceptoresBoletos(req);
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.get("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
    try {
        const result = await getAllReceptoresBoletos(req);
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

router.delete("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
    try {
        const result = await deleteReceptoresBoletos(req);
        res.status(200).send(result);
    } catch (error) {
        res.status(400).send({ message: error.message });
    }
});

module.exports = router;