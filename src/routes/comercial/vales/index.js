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
} = require("../../../controllers/comercial/vales-controller");
const hasPermissionMiddleware = require("../../../middlewares/permission-middleware");

router.get("/", hasPermissionMiddleware(["VALES:VER", "MASTER"]), async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id", hasPermissionMiddleware(["VALES:VER", "MASTER"]), async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  "/abatimentos/:id",
  hasPermissionMiddleware(["VALES:VER", "MASTER"]),
  async (req, res) => {
    try {
      const result = await getOneAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post("/", hasPermissionMiddleware(["VALES:CRIAR", "MASTER"]), async (req, res) => {
  try {
    const result = await insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post(
  "/lancamento-lote",
  hasPermissionMiddleware(["VALES:CRIAR", "MASTER"]),
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
  hasPermissionMiddleware(["VALES:CRIAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put("/", hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]), async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put(
  "/abatimentos",
  hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await updateAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete("/:id", hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]), async (req, res) => {
  try {
    const result = await deleteVale(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete(
  "/abatimentos/:id",
  hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]),
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
