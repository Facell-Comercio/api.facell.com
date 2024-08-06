const router = require("express").Router();
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
  deleteAgregador,
  insertOne,
  update,
  lancamentoLote,
} = require("../../../controllers/comercial/agregadores-controller");

router.get(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", [
    "GERENCIAR_METAS",
    "VISUALIZAR_METAS",
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
    "GERENCIAR_METAS",
    "VISUALIZAR_METAS",
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

router.post(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_METAS", "MASTER"]),
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
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_METAS", "MASTER"]),
  async (req, res) => {
    try {
      const result = await lancamentoLote(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_METAS", "MASTER"]),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_METAS", "MASTER"]),
  async (req, res) => {
    try {
      const result = await deleteAgregador(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
