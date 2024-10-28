const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");

//* CLIENTES COMPRAS
router.get("/", async (req, res) => {
  try {
    const result = await controller.getAllCompras(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
router.post("/", controller.insertCampanha);
router.post("/import-compras", controller.importComprasDatasys);

module.exports = router;
