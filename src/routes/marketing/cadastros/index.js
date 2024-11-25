const router = require("express").Router();

const controller = require("../../../controllers/marketing/cadastros/cadastros-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

//* PLANOS
router.get(
  "/planos",

  controller.getAllPlanos
);
router.get(
  "/planos/:id",

  controller.getOnePlano
);
router.post(
  "/planos",

  controller.insertOnePlano
);
router.put(
  "/planos",

  controller.updatePlano
);
router.delete(
  "/planos/:id",

  controller.updatePlano
);

//* VENDEDORES
router.get(
  "/vendedores",

  controller.getAllVendedores
);
router.get(
  "/vendedores/:id",

  controller.getOneVendedor
);
router.post(
  "/vendedores",

  controller.insertOneVendedor
);
router.put(
  "/vendedores",

  controller.updateVendedor
);
router.delete(
  "/vendedores/:id",

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
