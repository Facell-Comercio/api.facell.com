const router = require("express").Router();

const {
  getAll,
  getOne,
  updateFileTitulo,
  getAllCpTitulosBordero,
  changeStatusTitulo,
  update,
  insertOne,
  insertOneRecorrencia,
  getAllRecorrencias,
} = require("../../../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller");

router.post("/update-anexo", async (req, res) => {
  try {
    const result = await updateFileTitulo(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/change-status", async (req, res) => {
  try {
    const result = await changeStatusTitulo(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/titulos-bordero", async (req, res) => {
  try {
    const result = await getAllCpTitulosBordero(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/recorrencias", async (req, res) => {
  try {
    const result = await getAllRecorrencias(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/criar-recorrencia", async (req, res) => {
  try {
    const result = await insertOneRecorrencia(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const result = await insertOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/", async (req, res) => {
  try {
    const result = await update(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;
