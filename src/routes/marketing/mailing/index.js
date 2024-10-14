const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");

//* CLIENTES
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

//* CAMPANHAS
router.get("/campanhas", async (req, res) => {
  try {
    const result = await controller.getAllCampanhas(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/campanhas/:id", async (req, res) => {
  try {
    const result = await controller.getOneCampanha(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//* CLIENTES
router.put("/campanhas/clientes/:id", async (req, res) => {
  try {
    const result = await controller.updateClienteCampanha(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
