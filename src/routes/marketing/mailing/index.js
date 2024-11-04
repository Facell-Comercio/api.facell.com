const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");
const campanhas = require("./campanhas");
const clientes = require("./clientes");

router.use("/campanhas", campanhas);
router.use("/clientes", clientes);

router.post(
  "/nova-campanha",

  controller.insertCampanha
);

//* APARELHOS
router.get(
  "/aparelhos",

  controller.getAllAparelhos
);
router.get(
  "/aparelhos/estoque",

  controller.getEstoqueAparelho
);

module.exports = router;
