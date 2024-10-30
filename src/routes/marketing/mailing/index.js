const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");
const campanhas = require("./campanhas");
const clientes = require("./clientes");

router.use("/campanhas", campanhas);
router.use("/clientes", clientes);

//* APARELHOS
router.get(
  "/aparelhos",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllAparelhos
);
router.get(
  "/aparelhos/estoque",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getEstoqueAparelho
);

//* VENDEDORES
router.get(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllVendedores
);

module.exports = router;
