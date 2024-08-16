const {
  importCieloVendas
} = require("../../../../controllers/financeiro/controle-de-caixa/controle-de-caixa-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

const router = require("express").Router();

router.post(
  "/cielo-vendas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await importCieloVendas(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);


module.exports = router;
