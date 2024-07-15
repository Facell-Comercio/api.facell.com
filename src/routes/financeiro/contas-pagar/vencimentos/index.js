const router = require("express").Router();

const {
  getVencimentosAPagar,
  getVencimentosPagos,
  getVencimentosEmBordero,
  changeFieldVencimentos,
} = require("../../../../controllers/financeiro/contas-a-pagar/vencimentos-controller");

router.get("/a-pagar", async (req, res) => {
  try {
    const result = await getVencimentosAPagar(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/em-bordero", async (req, res) => {
  try {
    const result = await getVencimentosEmBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/pagos", async (req, res) => {
  try {
    const result = await getVencimentosPagos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/change-fields", async (req, res) => {
  try {
    const result = await changeFieldVencimentos(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
