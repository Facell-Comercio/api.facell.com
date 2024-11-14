const router = require("express").Router();
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

const controller = require("../../../../controllers/comercial/vendas-invalidadas-controller");

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VENDAS_INVALIDAS",
    "VISUALIZAR_VENDAS_INVALIDAS",
    "MASTER",
  ]),
  controller.getAllVendasInvalidadas
);
router.get(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VENDAS_INVALIDAS",
    "VISUALIZAR_VENDAS_INVALIDAS",
    "MASTER",
  ]),
  controller.getOneVendaInvalidada
);
router.get(
  "/contestacoes/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VENDAS_INVALIDAS",
    "VISUALIZAR_VENDAS_INVALIDAS",
    "MASTER",
  ]),
  controller.getOneContestacao
);
router.post(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  controller.processarVendasInvalidadas
);
router.post(
  "/contestacoes",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  controller.insertOneContestacao
);
router.put(
  "/contestacoes",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  controller.updateStatusContestacao
);
router.put(
  "/rateio-automatico",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  async (req, res) => {
    try {
      const result = await controller.rateioAutomaticoVendasInvalidas(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);
router.delete(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  controller.excluirVendasInvalidadas
);

router.delete(
  "/contestacoes/:id",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VENDAS_INVALIDAS", "MASTER"]),
  controller.deleteContestacao
);

module.exports = router;
