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

module.exports = router;
