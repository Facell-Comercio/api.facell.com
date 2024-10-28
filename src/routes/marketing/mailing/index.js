const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");
const campanhas = require("./campanhas");
const clientes = require("./clientes");

router.use("/campanhas", campanhas);
router.use("/clientes", clientes);

//* APARELHOS
router.get("/aparelhos", controller.getAllAparelhos);

//* VENDEDORES
router.get("/vendedores", controller.getAllVendedores);

module.exports = router;
