const router = require("express").Router();

const controller = require("../../../../controllers/marketing/mailing/mailing-controller");
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

//* IMPORTAÇÕES
router.post(
  "/import-evolux",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
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
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:VER"]),
  controller.getAllCampanhas
);
router.get(
  "/export-evolux",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:VER"]),
  controller.exportSubcampanha
);
router.put(
  "/",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.updateCampanha
);
router.post(
  "/subcampanhas",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.insertSubcampanha
);
router.post(
  "/duplicar",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.duplicateCampanha
);
router.post(
  "/transferir",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.transferClientesSubcampanha
);
router.post(
  "/:id",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:VER"]),
  async (req, res) => {
    try {
      const result = await controller.getOneCampanha(req);
      res.status(200).send(result);
    } catch (error) {
      res.status(400).send({ message: error.message });
    }
  }
);
router.get(
  "/gsms/:id",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
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
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.deleteSubcampanha
);

//* CLIENTES CAMPANHA
router.get(
  "/clientes/:id",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"]),
  controller.getOneClienteCampanha
);
router.put(
  "/clientes",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.updateClienteCampanha
);
router.put(
  "/clientes/lote",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.updateClienteCampanhaLote
);
router.delete(
  "/clientes/lote",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.deleteClientesCampanhaLote
);

//* VENDEDORES
router.put(
  "/vendedores",
  checkUserAuthorization("MARKETING", "OR", ["MASTER", "MAILING:EDITAR"], true),
  controller.definirVendedoresLote
);

module.exports = router;
