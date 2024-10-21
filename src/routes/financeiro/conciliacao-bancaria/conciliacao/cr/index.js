const router = require("express").Router();

const controller = require("../../../../../controllers/financeiro/conciliacao-bancaria/conciliacao-cr-controller");
const checkUserAuthorization = require("../../../../../middlewares/authorization-middleware");

router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/conciliacoes", async (req, res) => {
  try {
    const result = await controller.getConciliacoes(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/extratos-debit", async (req, res) => {
  try {
    const result = await controller.getExtratosDebit(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/extratos-duplicated", async (req, res) => {
  try {
    const result = await controller.getExtratoDuplicated(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await controller.getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await controller.insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
router.post(
  "/automatica",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.conciliacaoAutomatica(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.post(
  "/transferencia-contas",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.conciliacaoTransferenciaContas(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put("/", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await controller.update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put(
  "/tratar-duplicidade",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await controller.tratarDuplicidade(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.delete("/:id", checkUserAuthorization("FINANCEIRO", "OR", "MASTER"), async (req, res) => {
  try {
    const result = await controller.deleteConciliacao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
