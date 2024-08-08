const router = require("express").Router();
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

const {
  getAll,
  getOne,
  deleteMeta,
  insertOne,
  update,
  lancamentoLote,
  exportLayoutMetas,
  getComparison,
} = require("../../../controllers/comercial/metas-controller");

router.get(
  "/",

  async (req, res) => {
    try {
      const result = await getAll(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/export-metas", async (req, res) => {
  try {
    await exportLayoutMetas(req, res);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/comparison", async (req, res) => {
  try {
    const result = await getComparison(req, res);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  "/:id",

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

router.put("/", async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete(
  "/:id",
  checkUserAuthorization("FINANCEIRO", "OR", ["GERENCIAR_METAS", "MASTER"]),
  async (req, res) => {
    try {
      const result = await deleteMeta(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
