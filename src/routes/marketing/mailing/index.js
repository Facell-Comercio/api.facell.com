const router = require("express").Router();

const controller = require("../../../controllers/marketing/mailing/mailing-controller");

//* CLIENTES COMPRAS
router.get("/clientes", async (req, res) => {
  try {
    const result = await controller.getAllCompras(req);
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
router.get("/campanhas/clientes/:id", async (req, res) => {
  try {
    const result = await controller.getOneClienteCampanha(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/campanhas/clientes", async (req, res) => {
  try {
    const result = await controller.updateClienteCampanha(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/campanhas/clientes/lote", async (req, res) => {
  try {
    const result = await controller.updateClienteCampanhaLote(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

//* APARELHOS
router.get("/aparelhos", async (req, res) => {
  try {
    const result = await controller.getAllAparelhos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
