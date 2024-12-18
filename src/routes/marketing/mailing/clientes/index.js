const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

//* CLIENTES COMPRAS
router.post(
  "/",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  async (req, res) => {
    try {
      const result = await controller.getAllCompras(req);
      res.json(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

router.post(
  "/import-compras",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  async (req, res) => {
    try {
      const result = await controller.importComprasDatasys(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

module.exports = router;
