const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

//* IMPORTAÇÕES
router.post(
  "/import-evolux",

  async (req, res) => {
    try {
      const result = await controller.importCampanhaEvolux(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);

//* CAMPANHAS
router.get(
  "/",

  controller.getAllCampanhas
);
router.get(
  "/export-evolux",

  controller.exportSubcampanha
);
router.put(
  "/",

  controller.updateCampanha
);
router.post(
  "/subcampanhas",

  controller.insertSubcampanha
);
router.post(
  "/duplicar",

  controller.duplicateCampanha
);
router.post("/:id", async (req, res) => {
  try {
    const result = await controller.getOneCampanha(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
router.get(
  "/gsms/:id",

  async (req, res) => {
    try {
      const result = await controller.getOneCampanhaGSMS(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);
router.delete(
  "/:id",

  controller.deleteSubcampanha
);

//* CLIENTES CAMPANHA
router.get(
  "/clientes/:id",

  controller.getOneClienteCampanha
);
router.put(
  "/clientes",

  controller.updateClienteCampanha
);
router.put(
  "/clientes/lote",

  controller.updateClienteCampanhaLote
);
router.delete(
  "/clientes/lote",

  controller.deleteClientesCampanhaLote
);

//* VENDEDORES
router.put(
  "/vendedores",

  controller.definirVendedoresLote
);

module.exports = router;
