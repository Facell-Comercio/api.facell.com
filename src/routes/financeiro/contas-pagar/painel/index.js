const router = require("express").Router();

const {
  getAllSolicitacoesNegadas,
  getAllNotasFiscaisPendentes,
  getAllRecorrenciasPendentes,
} = require("../../../../controllers/financeiro/contas-a-pagar/painel-controller");

router.get("/negados", async (req, res) => {
  try {
    const result = await getAllSolicitacoesNegadas(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/sem-nota", async (req, res) => {
  try {
    const result = await getAllNotasFiscaisPendentes(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/recorrencias", async (req, res) => {
  try {
    const result = await getAllRecorrenciasPendentes(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
