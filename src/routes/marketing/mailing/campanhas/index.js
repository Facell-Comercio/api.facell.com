const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

//* IMPORTAÇÕES
router.post(
  "/import-evolux",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
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
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getAllCampanhas
);
router.get(
  "/export-evolux",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.exportSubcampanha
);
router.post("/:id", checkUserAuthorization("MARKETING", "OR", "MASTER", true), async (req, res) => {
  try {
    const result = await controller.getOneCampanha(req);
    res.status(200).send(result);
  } catch (error) {
    res.status(400).send({ message: error.message });
  }
});
router.post(
  "/subcampanhas",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.insertSubcampanha
);
router.post(
  "/duplicar",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.duplicateCampanha
);

//* CLIENTES CAMPANHA
router.get(
  "/clientes/:id",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.getOneClienteCampanha
);
router.put(
  "/clientes",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updateClienteCampanha
);
router.put(
  "/clientes/lote",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.updateClienteCampanhaLote
);
router.delete(
  "/clientes/lote",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.deleteClientesCampanhaLote
);

//* VENDEDORES
router.put(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", "MASTER", true),
  controller.definirVendedoresLote
);

module.exports = router;
