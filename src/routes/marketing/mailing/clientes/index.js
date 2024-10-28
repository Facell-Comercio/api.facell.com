const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");

//* CLIENTES COMPRAS
router.get("/", controller.getAllCompras);
router.post("/", controller.insertCampanha);
router.post("/import-compras", controller.importComprasDatasys);

module.exports = router;
