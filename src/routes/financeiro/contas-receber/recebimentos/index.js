const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/contas-a-receber/recebimentos/recebimentos-controller");

router.get("/", async (req, res) => {
  try {
    const result = await controller.getAllRecebimentos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/conta-bancaria", async (req, res) => {
  try {
    const result = await controller.getAllTransacoesAndVencimentos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/manual", async (req, res) => {
  try {
    const result = await controller.insertOneRecebimentoManual(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/conta-bancaria", async (req, res) => {
  try {
    const result = await controller.insertRecebimentosContaBancaria(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
