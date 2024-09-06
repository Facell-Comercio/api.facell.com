const router = require("express").Router();
const checkUserAuthorization = require("../../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
  insertCargoPolitica,
  update,
  removeCargoPolitica,
  getOneModelo,
  updateModelo,
  insertModelo,
  getOneModeloItem,
  updateModeloItem,
  insertModeloItem,
} = require("../../../../controllers/comercial/politicas-controller");

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getAll(req);
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

router.get(
  "/modelos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getOneModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.get(
  "/modelos/itens/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "VISUALIZAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getOneModeloItem(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.post(
  "/cargos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await insertCargoPolitica(
        req
      );
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.post(
  "/modelos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await insertModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.post(
  "/modelos/itens",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await insertModeloItem(req);
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

router.put(
  "/modelos",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await updateModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.put(
  "/modelos/itens",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await updateModeloItem(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.delete(
  "/cargos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await removeCargoPolitica(
        req
      );
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

module.exports = router;
