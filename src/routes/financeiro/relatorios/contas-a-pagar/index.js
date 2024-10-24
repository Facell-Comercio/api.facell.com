const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/relatorios/relatorios-controller");

router.get("/export-previsao-pagamento", async (req, res) => {
  try {
    await controller.exportLayoutPrevisaoPagamentoCP(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/export-layout-despesas", async (req, res) => {
  try {
    await controller.exportLayoutDespesasCP(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/export-layout-vencimentos", async (req, res) => {
  try {
    await controller.exportLayoutVencimentosCP(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/export-datasys", async (req, res) => {
  try {
    await controller.exportLayoutDatasysCP(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
