const router = require("express").Router();
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

const controller = require("../../../controllers/comercial/vales-controller");
const hasPermissionMiddleware = require("../../../middlewares/permission-middleware");

router.get("/", hasPermissionMiddleware(["VALES:VER", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get(
  "/users-abonar",
  hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await controller.getAllUsersPermissaoAbono(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get("/:id", hasPermissionMiddleware(["VALES:VER", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.getOne(req);
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
      const result = await controller.getOneAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post("/", hasPermissionMiddleware(["VALES:CRIAR", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.insertOne(req);
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
      const result = await controller.lancamentoLote(req);
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
      const result = await controller.insertAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put("/", hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.update(req);
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
      const result = await controller.updateAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/abonos-lote",
  hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await controller.abonoValesLote(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete("/:id", hasPermissionMiddleware(["VALES:EDITAR", "MASTER"]), async (req, res) => {
  try {
    const result = await controller.deleteVale(req);
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
      const result = await controller.deleteAbatimento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
