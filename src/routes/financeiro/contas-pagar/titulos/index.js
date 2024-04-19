const router = require("express").Router();

const {
  getAll,
  getOne,
  getAllCpTitulosBordero,
} = require("../../../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller");

router.get("/", async (req, res) => {
  const result = await getAll(req);
  res.status(200).json(result);
});

router.get("/titulos-bordero", async (req, res) => {
  const result = await getAllCpTitulosBordero(req);
  res.status(200).json(result);
});
router.get("/:id", async (req, res) => {
  const result = await getOne(req);
  res.status(200).json(result);
});

module.exports = router;
