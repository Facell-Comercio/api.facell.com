const router = require("express").Router();

const {
  getAll,
  getOne,
  insertOne,
  update,
  updateFileTitulo,
  changeFieldTitulos,
  changeStatusTitulo,
  exportLayoutDatasys,
  importLoteSolicitacoes,
  getOneByTimParams,
  getPendencias,

  getAllRecorrencias,
  insertOneRecorrencia,
  updateRecorrencia,
  deleteRecorrencia,
} = require("../../../../controllers/financeiro/contas-a-pagar/titulo-pagar-controller");

router.get("/export-datasys", async (req, res) => {
  try {
    const result = await exportLayoutDatasys(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

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

router.put("/change-fields", async (req, res) => {
  try {
    const result = await changeFieldTitulos(req);
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

router.get("/by-tim", async (req, res) => {
  try {
    const result = await getOneByTimParams(req);
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

router.get("/pendencias", async (req, res) => {
  try {
    const result = await getPendencias(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.get("/pendencias", async (req, res) => {
  try {
    const result = await getPendencias(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/recorrencias/:id", async (req, res) => {
  try {
    const result = await deleteRecorrencia(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/recorrencias/:id", async (req, res) => {
  try {
    const result = await updateRecorrencia(req);
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

router.post("/solicitacao-lote", async (req, res) => {
  try {
    const result = await importLoteSolicitacoes(req);
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
