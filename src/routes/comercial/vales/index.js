const router = require("express").Router();
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
  deleteVale,
  insertOne,
  update,
  insertAbatimento,
  getOneAbatimento,
  updateAbatimento,
  deleteAbatimento,
  lancamentoLote,
} = require("../../../controllers/comercial/comercial-controller");

//! Refazer as validações de autorização

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VALES",
    "VISUALIZAR_VALES",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getAll(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VALES",
    "VISUALIZAR_VALES",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getOne(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/abatimentos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_VALES",
    "VISUALIZAR_VALES",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await getOneAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertOne(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/lancamento-lote",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await lancamentoLote(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/abatimentos",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/abatimentos",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await updateAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await deleteVale(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/abatimentos/:id",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_VALES", "MASTER"]),
  async (req, res) => {
    try {
      const result = await deleteAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
