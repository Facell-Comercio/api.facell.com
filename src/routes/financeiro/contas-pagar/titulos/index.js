const router = require("express").Router();

const {
  getAll,
  getOne,
  updateFileTitulo,
} = require("../../../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller");

router.post("/update-anexo", async (req, res) => {
  const result = await updateFileTitulo(req);
  res.status(200).json(result);
});

router.get("/", async (req, res) => {
  const result = await getAll(req);
  res.status(200).json(result);
});

router.get("/:id", async (req, res) => {
  const result = await getOne(req);
  res.status(200).json(result);
});



module.exports = router;
