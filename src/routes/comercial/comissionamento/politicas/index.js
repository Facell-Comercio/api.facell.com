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
} = require("../../../../controllers/comercial/politicas-controller");
const checkUserPermissionMiddleware = require("../../../../middlewares/permission-middleware");

router.get(
  "/",
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
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
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
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
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
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
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
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
  "/",
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await insertOne(req);
      res.status(200).json(result);
    } catch (error) {
      res
        .status(400)
        .json({ message: error.message });
    }
  }
);

router.post(
  "/copy",
  checkUserPermissionMiddleware([
    "GERENCIAR_POLITICAS",
    "MASTER",
  ]),
  async (req, res) => {
    try {
      const result = await copyPolitica(req);
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
  checkUserPermissionMiddleware([
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
