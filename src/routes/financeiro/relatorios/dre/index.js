const router = require("express").Router();

const controller = require("../../../../controllers/financeiro/relatorios/relatorios-controller");

router.get("/export-layout-dre-gerencial", async (req, res) => {
  try {
    await controller.exportLayoutDREGerencial(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
