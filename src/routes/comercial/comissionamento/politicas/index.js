const router = require("express").Router();

const {
  getAll,
  getOne,
  getOneModelo,
  getOneModeloItem,

  insertCargoPolitica,
  insertModeloItem,
  insertModelo,

  updateModelo,
  updateModeloItem,

  removeCargoPolitica,
  insertOne,
  copyPolitica,
  getAllCargos,
} = require("../../../../controllers/comercial/politicas-controller");
const hasPermissionMiddleware = require("../../../../middlewares/permission-middleware");

router.get(
  "/",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_VER", "MASTER"]),
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
  "/politica",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_VER", "MASTER"]),
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
  "/modelos/:id",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_VER", "MASTER"]),
  async (req, res) => {
    try {
      const result = await getOneModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.get(
  "/modelos/itens/:id",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_VER", "MASTER"]),
  async (req, res) => {
    try {
      const result = await getOneModeloItem(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_GERAR", "MASTER"]),
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
  "/copy",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_GERAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await copyPolitica(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/cargos",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_GERAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertCargoPolitica(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/modelos",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_GERAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.post(
  "/modelos/itens",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_GERAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await insertModeloItem(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_EDITAR", "MASTER"]),
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
  "/modelos",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await updateModelo(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.put(
  "/modelos/itens",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await updateModeloItem(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

router.delete(
  "/cargos/:id",
  hasPermissionMiddleware(["COMISSOES:POLITICAS_EDITAR", "MASTER"]),
  async (req, res) => {
    try {
      const result = await removeCargoPolitica(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
);

module.exports = router;
