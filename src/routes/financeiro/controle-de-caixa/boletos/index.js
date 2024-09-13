const router = require("express").Router();

const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");
const {
  getAllBoletos,
  getAllCaixasComSaldo,
} = require("../../../../controllers/financeiro/controle-de-caixa/boletos");

router.get("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await getAllBoletos(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

router.get(
  "/caixas-com-saldo",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await getAllCaixasComSaldo(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

module.exports = router;
