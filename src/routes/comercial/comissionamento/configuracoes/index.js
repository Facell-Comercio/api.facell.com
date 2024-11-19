const router = require("express").Router();
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
  update,
} = require("../../../../controllers/comercial/politicas-controller");
const {
  deleteVale,
} = require("../../../../controllers/comercial/vales-controller");
const {
  getEscalonamentos,
  getCargos,
  getSegmentos,
} = require("../../../../controllers/comercial/configuracoes-controller");

router.get(
  "/escalonamentos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getEscalonamentos(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.get(
  "/segmentos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getSegmentos(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.get(
  "/cargos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getCargos(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.get(
  "/politica",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getOne(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.post(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await insertOne(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.put(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await deleteVale(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

module.exports = router;
