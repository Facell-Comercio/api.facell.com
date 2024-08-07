const router = require("express").Router();

const {
  getAll,
  getOne,
  deleteAgregador,
  insertOne,
  update,
  lancamentoLote,
} = require("../../../controllers/comercial/agregadores-controller");
const checkUserPermissionMiddleware = require("../../../middlewares/permission-middleware");

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
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

router.post(
  "/",
  checkUserPermissionMiddleware(["GERENCIAR_METAS", "MASTER"]),
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
  checkUserPermissionMiddleware(["GERENCIAR_METAS", "MASTER"]),
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
  checkUserPermissionMiddleware(["GERENCIAR_METAS", "MASTER"]),
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
  checkUserPermissionMiddleware(["GERENCIAR_METAS", "MASTER"]),
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
