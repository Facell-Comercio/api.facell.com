const router = require("express").Router();

const {
  changeFieldVencimentosFaturas,
  getAllVencimentosEFaturas,
} = require("../../../../controllers/financeiro/contas-a-pagar/vencimentos-controller");

router.get("/vencimentos-e-faturas", async (req, res) => {
  try {
    const result = await getAllVencimentosEFaturas(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/change-fields", async (req, res) => {
  try {
    const result = await changeFieldVencimentosFaturas(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
