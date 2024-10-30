const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");

//* CAMPANHAS
router.get("/", controller.getAllCampanhas);
router.get("/export-evolux", controller.exportSubcampanha);
router.post("/:id", async (req, res) => {
  try {
    const result = await controller.getOneCampanha(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
router.post("/subcampanhas", controller.insertSubcampanha);
router.post("/duplicar", controller.duplicateCampanha);
router.put("/import-evolux", async (req, res) => {
  try {
    const result = await controller.importCampanhaEvolux(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});

//* CLIENTES CAMPANHA
router.get("/clientes/:id", controller.getOneClienteCampanha);
router.put("/clientes", controller.updateClienteCampanha);
router.put("/clientes/lote", controller.updateClienteCampanhaLote);
router.delete("/clientes/lote", controller.deleteClientesCampanhaLote);

//* VENDEDORES
router.put("/vendedores", controller.definirVendedoresLote);

module.exports = router;
