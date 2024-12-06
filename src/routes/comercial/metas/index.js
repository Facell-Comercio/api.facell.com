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
  importMetas,
} = require("../../../controllers/comercial/metas-controller");
const hasPermissionMiddleware = require("../../../middlewares/permission-middleware");

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

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

router.get("/:id", async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", hasPermissionMiddleware(["METAS:METAS_CRIAR", "MASTER"]), async (req, res) => {
  try {
    const result = await insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/import",
  hasPermissionMiddleware(["METAS:METAS_CRIAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await importMetas(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put("/", hasPermissionMiddleware(["METAS:METAS_EDITAR", "MASTER"]), async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete(
  "/:id",
  hasPermissionMiddleware(["METAS:METAS_EDITAR", "MASTER"]),
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
