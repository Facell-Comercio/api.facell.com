const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/contas-a-receber/titulo-receber/titulo-receber-controller");

//* TÍTULOS
router.get("/", async (req, res) => {
  try {
    const result = await controller.getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/vencimentos", async (req, res) => {
  try {
    const result = await controller.getAllVencimentosCR(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await controller.getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await controller.insertOneTituloReceber(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const result = await controller.update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/change-status", async (req, res) => {
  try {
    const result = await controller.changeStatusTituloReceber(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/reembolso-tim-lote", async (req, res) => {
  try {
    const result = await controller.lancamentoReebolsosTim(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/comissoes-tim-lote", async (req, res) => {
  try {
    const result = await controller.lancamentoComissoesTim(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

//* RECEBIMENTOS
router.get("/vencimentos/recebimentos", async (req, res) => {
  try {
    const result = await controller.getAllRecebimentosVencimento(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/vencimentos/recebimentos/:id", async (req, res) => {
  try {
    const result = await controller.deleteRecebimento(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
