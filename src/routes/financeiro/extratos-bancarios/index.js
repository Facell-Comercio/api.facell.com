const router = require("express").Router();

const {
  getAll,
  getAllTransacaoPadrao,
  getOne,
  importarExtrato,
  update,
  deleteTransacaoPadrao,
  insertOneTransacaoPadrao,
  updateTransacaoPadrao,
} = require("../../../controllers/financeiro/extratos-bancarios/extratos-controller");
const checkUserAuthorization = require("../../../middlewares/authorization-middleware.js");

// * Transação Padrão
router.get("/transacao-padrao", async (req, res) => {
  try {
    const result = await getAllTransacaoPadrao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/transacao-padrao", async (req, res) => {
  try {
    const result = await insertOneTransacaoPadrao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete("/transacao-padrao", async (req, res) => {
  try {
    const result = await deleteTransacaoPadrao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put("/transacao-padrao", async (req, res) => {
  try {
    const result = await updateTransacaoPadrao(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// * Extratos Bancários
router.get("/extratos-bancarios/", async (req, res) => {
  try {
    const result = await getAll(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const result = await getOne(req);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post(
  "/importar-extrato",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  
  async (req, res) => {
    try {
      const result = await importarExtrato(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

router.put(
  "/",
  checkUserAuthorization("FINANCEIRO", "OR", "MASTER"),
  async (req, res) => {
    try {
      const result = await update(req);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);

module.exports = router;
