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
