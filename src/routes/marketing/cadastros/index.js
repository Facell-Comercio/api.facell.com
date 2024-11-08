const router = require("express").Router();

const controller = require("../../../controllers/marketing/cadastros/cadastros-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

//* PLANOS
router.get(
  "/planos",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllPlanos
);
router.get(
  "/planos/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getOnePlano
);
router.post(
  "/planos",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.insertOnePlano
);
router.put(
  "/planos",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updatePlano
);
router.delete(
  "/planos/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updatePlano
);

//* VENDEDORES
router.get(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllVendedores
);
router.get(
  "/vendedores/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getOneVendedor
);
router.post(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.insertOneVendedor
);
router.put(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updateVendedor
);
router.delete(
  "/vendedores/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.deleteVendedor
);

//* INTERACOES MANUAIS
router.get(
  "/interacoes-manuais",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllInteracoesManuais
);
router.get(
  "/interacoes-manuais/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getOneInteracaoManual
);
router.post(
  "/interacoes-manuais",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.insertOneInteracaoManual
);
router.put(
  "/interacoes-manuais",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updateInteracaoManual
);
router.delete(
  "/interacoes-manuais/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.deleteInteracaoManual
);

module.exports = router;
