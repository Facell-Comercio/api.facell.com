const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");

router.get("/clientes", async (req, res) => {
  try {
    const result = await controller.getClientes(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/clientes", async (req, res) => {
  try {
    const result = await controller.insertCampanha(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/import-compras", async (req, res) => {
  try {
    const result = await controller.importComprasDatasys(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
