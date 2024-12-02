const router = require("express").Router();

const {
  getAll,
  getOne,
  deleteAgregador,
  insertOne,
  update,
  importAgregadores,
  exportLayoutAgregadores,
} = require("../../../controllers/comercial/agregadores-controller");
const hasPermissionMiddleware = require("../../../middlewares/permission-middleware");

router.get("/", hasPermissionMiddleware(["METAS:AGREGADORES_VER", "MASTER"]), async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  "/export-agregadores",
  hasPermissionMiddleware(["METAS:AGREGADORES_VER", "MASTER"]),
  async (req, res) => {
    try {
      await exportLayoutAgregadores(req, res);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/:id",
  hasPermissionMiddleware(["METAS:AGREGADORES_VER", "MASTER"]),
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
  hasPermissionMiddleware(["METAS:AGREGADORES_CRIAR", "MASTER"]),
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
  "/import",
  hasPermissionMiddleware(["METAS:AGREGADORES_CRIAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await importAgregadores(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/",
  hasPermissionMiddleware(["METAS:AGREGADORES_EDITAR", "MASTER"]),
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
  hasPermissionMiddleware(["METAS:AGREGADORES_EDITAR", "MASTER"]),
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
