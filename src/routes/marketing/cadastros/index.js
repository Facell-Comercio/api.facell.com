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

module.exports = router;
