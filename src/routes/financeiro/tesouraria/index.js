const router = require("express").Router();

const controller = require("../../../controllers/financeiro/tesouraria/tesouraria-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware");

router.get("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await controller.getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/transferir-saldo",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.transferirSaldo(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/adiantamento",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.insertAdiantamento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put(
  "/vincular-adiantamento",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.vincularAdiantamento(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
